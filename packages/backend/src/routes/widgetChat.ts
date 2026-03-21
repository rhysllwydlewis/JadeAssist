/**
 * Widget chat route — public endpoint for the embedded JadeAssist widget.
 *
 * Unlike POST /api/chat (which requires JWT + UUID userId), this endpoint is
 * intentionally unauthenticated so that anonymous visitors on public sites
 * (e.g. event-flow.co.uk) can chat without logging in.
 *
 * Abuse protection is provided by a stricter per-IP rate limiter.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { planningEngine } from '../services/planningEngine';
import { logger } from '../utils/logger';
import { RATE_LIMITS } from '../utils/constants';

const router = Router();

// ── Rate limiter — stricter than the global limiter ──────────────────────────
// 10 requests per minute per IP (vs 20/min for authenticated /api/chat).
const widgetRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.WIDGET_CHAT.windowMs,
  max: RATE_LIMITS.WIDGET_CHAT.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait a moment and try again.',
      },
      timestamp: new Date().toISOString(),
    });
  },
});

// ── Request schema ────────────────────────────────────────────────────────────
// userId is optional and does NOT need to be a UUID — anonymous visitors are
// welcome.  conversationId is optional but, if provided, is used as-is so the
// widget can maintain continuity across turns (within a single page session).
const widgetChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * POST /api/widget/chat
 * Send a message via the embedded widget without requiring authentication.
 */
router.post(
  '/',
  widgetRateLimiter,
  optionalAuth,
  validateBody(widgetChatRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const { message, conversationId, userId } = req.body as {
      message: string;
      conversationId?: string;
      userId?: string;
    };

    // Resolve identifiers — fall back to anonymous/random values so the
    // planning engine always has something to work with.
    const resolvedUserId = userId ?? authReq.userId ?? 'anonymous';
    const resolvedConversationId = conversationId ?? randomUUID();

    logger.info(
      { conversationId: resolvedConversationId, userId: resolvedUserId },
      'Widget chat message received'
    );

    let planningResponse;
    try {
      planningResponse = await planningEngine.processRequest(
        {
          conversationId: resolvedConversationId,
          userId: resolvedUserId,
        },
        message
      );
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : '';
      const isRateLimit = errMessage.startsWith('RATE_LIMIT:');

      const fallbackContent = isRateLimit
        ? "I'm getting a lot of requests right now — please give me a moment and try again. ⏳"
        : "I'm having trouble connecting to my planning system right now. Please try again in a moment.";

      logger.warn({ err, conversationId: resolvedConversationId }, 'Widget chat planning error');

      res.status(isRateLimit ? 429 : 503).json({
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'LLM_ERROR',
          message: fallbackContent,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const now = new Date().toISOString();

    res.status(200).json({
      success: true,
      data: {
        conversationId: resolvedConversationId,
        message: {
          id: randomUUID(),
          content: planningResponse.message,
          role: 'assistant',
          createdAt: now,
        },
        suggestions: planningResponse.suggestions,
      },
      timestamp: now,
    });
  })
);

export default router;
