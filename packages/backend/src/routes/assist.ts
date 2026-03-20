/**
 * POST /api/v1/assist
 * Primary endpoint for EventFlow to call JadeAssist.
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { planningEngine } from '../services/planningEngine';
import { logger } from '../utils/logger';
import { EVENT_TYPES } from '@jadeassist/shared';
import type { EventType } from '@jadeassist/shared';

const router = Router();

// ── Request schema ──────────────────────────────────────────────────────────

const assistBodySchema = z.object({
  /** The event/message text coming from EventFlow */
  event: z.string().min(1, 'event is required'),
  /** Optional contextual information about the event or user */
  context: z
    .object({
      userId: z.string().optional(),
      conversationId: z.string().optional(),
      eventType: z.enum(EVENT_TYPES).optional(),
      budget: z.number().optional(),
      guestCount: z.number().optional(),
      /** ISO 8601 date string, e.g. "2025-06-15" */
      eventDate: z
        .string()
        .datetime({ offset: true })
        .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
      location: z.string().optional(),
    })
    .optional()
    .default({}),
  /** Caller-supplied idempotency key (forwarded in meta for tracing) */
  idempotencyKey: z.string().optional(),
});

type AssistBody = z.infer<typeof assistBodySchema>;

// ── Route ────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/assist
 * Accept an event from EventFlow, run it through the planning engine,
 * and return a structured result.
 *
 * Body:
 *   { event: string, context?: object, idempotencyKey?: string }
 *
 * Response:
 *   { result: string, meta: { requestId, idempotencyKey?, model } }
 */
router.post(
  '/',
  optionalAuth,
  validateBody(assistBodySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body as AssistBody;
    const requestId: string =
      typeof res.locals['requestId'] === 'string' ? res.locals['requestId'] : randomUUID();

    logger.info(
      {
        requestId,
        idempotencyKey: body.idempotencyKey,
        eventLength: body.event.length,
      },
      'assist request received'
    );

    // Build a minimal planning context from the supplied data
    const userId = body.context?.userId ?? req.userId ?? 'anonymous';
    const conversationId = body.context?.conversationId ?? randomUUID();

    const planningContext = {
      conversationId,
      userId,
      eventType: body.context?.eventType as EventType | undefined,
      budget: body.context?.budget,
      guestCount: body.context?.guestCount,
      eventDate: body.context?.eventDate ? new Date(body.context.eventDate) : undefined,
      location: body.context?.location,
    };

    const planningResult = await planningEngine.processRequest(planningContext, body.event);

    res.status(200).json({
      result: planningResult.message,
      meta: {
        requestId,
        ...(body.idempotencyKey !== undefined && { idempotencyKey: body.idempotencyKey }),
        conversationId,
        suggestions: planningResult.suggestions,
        requiresMoreInfo: planningResult.requiresMoreInfo,
      },
    });
  })
);

export default router;
