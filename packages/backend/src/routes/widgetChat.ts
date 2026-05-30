/**
 * Widget chat route — public endpoint for the embedded JadeAssist widget.
 *
 * This route is intentionally public so anonymous EventFlow visitors can chat
 * with Jade without logging in. Abuse protection is provided by a stricter
 * per-IP limiter on POST requests.
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
import { isDbSchemaMissingError } from '../utils/dbErrors';

const router = Router();

const routeDiagnostics = {
  service: 'jadeassist-backend',
  package: '@jadeassist/backend',
  widgetChatPath: '/api/widget/chat',
};

const allowedMethods = ['OPTIONS', 'POST'] as const;
const allowHeader = allowedMethods.join(', ');

function methodNotAllowed(req: Request, res: Response): void {
  res.set('Allow', allowHeader);

  if (req.method === 'HEAD') {
    res.status(405).end();
    return;
  }

  res.status(405).json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `${req.method} is not supported on /api/widget/chat. Use POST for chat messages.`,
    },
    allowedMethods,
    ...routeDiagnostics,
    timestamp: new Date().toISOString(),
  });
}

// Route-level compatibility guard. App-level CORS middleware supplies the
// Access-Control-* headers; this prevents Railway/browser probes from showing
// this live endpoint as a missing-route 404.
router.options('/', (_req: Request, res: Response) => {
  res.set('Allow', allowHeader).sendStatus(204);
});

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

const widgetChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
});

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

    const resolvedUserId = userId ?? authReq.userId ?? 'anonymous';
    const resolvedConversationId = conversationId ?? randomUUID();

    logger.info(
      { conversationId: resolvedConversationId, userId: resolvedUserId },
      'Widget chat message received'
    );

    let planningResponse;
    try {
      planningResponse = await planningEngine.processRequest(
        { conversationId: resolvedConversationId, userId: resolvedUserId },
        message
      );
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : '';
      const isRateLimit = errMessage.startsWith('RATE_LIMIT:');
      const isDbSchema = !isRateLimit && isDbSchemaMissingError(err);

      if (isDbSchema) {
        logger.warn(
          { err, conversationId: resolvedConversationId },
          'Widget chat DB not available'
        );
        res.status(503).json({
          success: false,
          error: {
            code: 'DB_NOT_INITIALIZED',
            message:
              'The database is not available. Please check that MONGODB_URL is set correctly and the MongoDB service is running.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.warn({ err, conversationId: resolvedConversationId }, 'Widget chat planning error');
      res.status(isRateLimit ? 429 : 503).json({
        success: false,
        error: {
          code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : 'LLM_ERROR',
          message: isRateLimit
            ? "I'm getting a lot of requests right now — please give me a moment and try again."
            : "I'm having trouble connecting to my planning system right now. Please try again in a moment.",
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

router.all('/', methodNotAllowed);

export default router;
