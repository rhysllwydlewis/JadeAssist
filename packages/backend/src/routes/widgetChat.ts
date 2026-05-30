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
import { env } from '../config/env';

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

function widgetErrorResponse(err: unknown): {
  status: number;
  code: string;
  message: string;
  exposeDiagnostics?: boolean;
} {
  const errMessage = err instanceof Error ? err.message : '';

  if (errMessage.startsWith('OPENAI_INSUFFICIENT_QUOTA:')) {
    return {
      status: 503,
      code: 'OPENAI_INSUFFICIENT_QUOTA',
      message:
        'Jade is temporarily unavailable while the AI service quota is being updated. Please try again later.',
      exposeDiagnostics: true,
    };
  }

  if (errMessage.startsWith('RATE_LIMIT:')) {
    return {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: "I'm getting a lot of requests right now — please give me a moment and try again.",
    };
  }

  if (errMessage.startsWith('LLM_NOT_CONFIGURED:')) {
    return {
      status: 503,
      code: 'LLM_NOT_CONFIGURED',
      message: 'Jade is online, but the AI provider is not configured yet. Please add OPENAI_API_KEY in Railway.',
      exposeDiagnostics: true,
    };
  }

  if (errMessage === 'EMPTY_LLM_RESPONSE') {
    return {
      status: 503,
      code: 'EMPTY_LLM_RESPONSE',
      message: 'Jade connected to the AI provider, but received an empty response. Please try again.',
    };
  }

  if (isDbSchemaMissingError(err)) {
    return {
      status: 503,
      code: 'DB_NOT_INITIALIZED',
      message:
        'Jade is online, but the database is not available yet. Please check MONGODB_URL and the MongoDB service in Railway.',
      exposeDiagnostics: true,
    };
  }

  return {
    status: 503,
    code: 'LLM_ERROR',
    message: "I'm having trouble connecting to my planning system right now. Please try again in a moment.",
  };
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
  message: z.string().trim().min(1).max(5000),
  conversationId: z.string().uuid().optional(),
  userId: z.string().trim().min(1).max(120).optional(),
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
      const errorResponse = widgetErrorResponse(err);

      logger.warn(
        {
          err,
          conversationId: resolvedConversationId,
          errorCode: errorResponse.code,
          status: errorResponse.status,
        },
        'Widget chat request failed'
      );

      res.status(errorResponse.status).json({
        success: false,
        error: {
          code: errorResponse.code,
          message: errorResponse.message,
          ...(errorResponse.exposeDiagnostics && {
            minimalMode: env.minimalMode,
            minimalModeSetting: env.minimalModeSetting,
            serviceConfigured: env.serviceConfigured,
            missingVars: env.missingRequiredVars,
          }),
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
        searchResults: planningResponse.searchResults,
        assistantResponse: planningResponse.assistantResponse,
        conversation: {
          eventType: planningResponse.context.eventType,
          eventDate: planningResponse.context.eventDate,
          guestCount: planningResponse.context.guestCount,
          budget: planningResponse.context.budget,
          location: planningResponse.context.location,
          planningStage: planningResponse.context.planningStage,
          contextCompleteness: planningResponse.context.contextCompleteness,
          missingDetails: planningResponse.missingDetails,
        },
      },
      timestamp: now,
    });
  })
);

router.all('/', methodNotAllowed);

export default router;