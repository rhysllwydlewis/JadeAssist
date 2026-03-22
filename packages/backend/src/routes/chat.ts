/**
 * Chat routes - Conversation and messaging endpoints
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { ConversationModel } from '../models/Conversation';
import { planningEngine } from '../services/planningEngine';
import { ChatRequest, ChatResponse, ApiResponse, EventType } from '@jadeassist/shared';
import { logger } from '../utils/logger';
import { isDbSchemaMissingError } from '../utils/dbErrors';

const router = Router();

/** Safely coerce a string stored in the DB to a typed EventType (or undefined). */
function toEventType(value: string | undefined): EventType | undefined {
  const valid: EventType[] = ['wedding', 'birthday', 'corporate', 'conference', 'party', 'anniversary', 'other'];
  return value && valid.includes(value as EventType) ? (value as EventType) : undefined;
}

// Validation schemas
const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(5000),
  userId: z.string().uuid(),
});

/**
 * POST /chat
 * Send a message in a conversation
 */
router.post(
  '/',
  authenticateJWT,
  validateBody(chatRequestSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { conversationId, message, userId } = req.body as ChatRequest;

    logger.info({ conversationId, userId }, 'Chat message received');

    // Verify user matches authenticated user
    if (req.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'User ID mismatch',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let conversation;

    // Get or create conversation
    if (conversationId) {
      conversation = await ConversationModel.findById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } else {
      // Create new conversation
      conversation = await ConversationModel.create({ userId });
    }

    // Store user message
    await ConversationModel.addMessage(conversation.id, 'user', message);

    // Process with planning engine
    let planningResponse;
    try {
      planningResponse = await planningEngine.processRequest(
        {
          conversationId: conversation.id,
          userId,
          eventType: toEventType(conversation.eventType),
        },
        message
      );
    } catch (err) {
      // Return a user-friendly error instead of a 500 for known LLM failures
      const errMessage = err instanceof Error ? err.message : '';
      const isRateLimit = errMessage.startsWith('RATE_LIMIT:');
      const isDbSchema = !isRateLimit && isDbSchemaMissingError(err);

      if (isDbSchema) {
        res.status(503).json({
          success: false,
          error: {
            code: 'DB_SCHEMA_MISSING',
            message:
              'The database schema has not been initialised. ' +
              'Please apply database/schema.sql to the production database and restart the service.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const fallbackContent = isRateLimit
        ? "I'm getting a lot of requests right now — please give me a moment and try again. ⏳"
        : "I'm having trouble connecting to my planning system right now. Please try again in a moment.";

      // Store the fallback assistant message so conversation history remains consistent
      await ConversationModel.addMessage(conversation.id, 'assistant', fallbackContent);

      const messages = await ConversationModel.getMessages(conversation.id);
      const assistantMessage = messages[messages.length - 1];

      const chatResponse: ChatResponse = {
        conversationId: conversation.id,
        message: assistantMessage,
      };

      res.status(isRateLimit ? 429 : 503).json({
        success: false,
        data: chatResponse,
        error: {
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'LLM_ERROR',
          message: fallbackContent,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get the assistant message that was stored by planning engine
    const messages = await ConversationModel.getMessages(conversation.id);
    const assistantMessage = messages[messages.length - 1];

    const chatResponse: ChatResponse = {
      conversationId: conversation.id,
      message: assistantMessage,
      suggestions: planningResponse.suggestions,
    };

    const response: ApiResponse<ChatResponse> = {
      success: true,
      data: chatResponse,
      timestamp: new Date().toISOString(),
    };

    logger.info({ conversationId: conversation.id }, 'Chat response sent');

    res.status(200).json(response);
  })
);

/**
 * GET /chat/conversations
 * Get user's conversations
 */
router.get(
  '/conversations',
  authenticateJWT,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    logger.debug({ userId }, 'Fetching conversations');

    const conversations = await ConversationModel.findByUserId(userId);

    const response: ApiResponse = {
      success: true,
      data: conversations,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * GET /chat/conversations/:id
 * Get a specific conversation with messages
 */
router.get(
  '/conversations/:id',
  authenticateJWT,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    logger.debug({ conversationId: id, userId }, 'Fetching conversation');

    const conversation = await ConversationModel.findById(id);

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (conversation.userId !== userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const messages = await ConversationModel.getMessages(id);

    const response: ApiResponse = {
      success: true,
      data: {
        ...conversation,
        messages,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

export default router;
