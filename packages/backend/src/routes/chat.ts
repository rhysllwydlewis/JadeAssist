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
import { ChatRequest, ChatResponse, ApiResponse } from '@jadeassist/shared';
import { logger } from '../utils/logger';

const router = Router();

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
    await ConversationModel.addMessage(
      conversation.id,
      'user',
      message
    );

    // Process with planning engine
    const planningResponse = await planningEngine.processRequest(
      {
        conversationId: conversation.id,
        userId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        eventType: conversation.eventType as any,
      },
      message
    );

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
