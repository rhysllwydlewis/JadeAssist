/**
 * Planning routes - Event planning endpoints
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { EventPlanModel, CreateEventPlanParams } from '../models/EventPlan';
import { eventCalcService } from '../services/eventCalcService';
import { planningEngine } from '../services/planningEngine';
import { ApiResponse, EventType } from '@jadeassist/shared';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createPlanSchema = z.object({
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  eventType: z.enum([
    'wedding',
    'birthday',
    'corporate',
    'conference',
    'party',
    'anniversary',
    'other',
  ]),
  budget: z.number().positive().optional(),
  guestCount: z.number().int().positive().optional(),
  eventDate: z.string().datetime().optional(),
  location: z.string().optional(),
  postcode: z.string().optional(),
});

const updatePlanSchema = z.object({
  budget: z.number().positive().optional(),
  guestCount: z.number().int().positive().optional(),
  eventDate: z.string().datetime().optional(),
  location: z.string().optional(),
  postcode: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * POST /planning/plans
 * Create a new event plan
 */
router.post(
  '/plans',
  authenticateJWT,
  validateBody(createPlanSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const planData = req.body as CreateEventPlanParams & { eventDate?: string };
    const userId = req.userId!;

    logger.info({ userId, eventType: planData.eventType }, 'Creating event plan');

    // Verify user matches authenticated user
    if (planData.userId !== userId) {
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

    // Convert event date string to Date if provided
    const eventDate = planData.eventDate ? new Date(planData.eventDate) : undefined;

    const plan = await EventPlanModel.create({
      ...planData,
      eventDate,
    });

    // Calculate budget allocations if budget is provided
    let calculations = undefined;
    if (plan.budget && plan.guestCount) {
      calculations = eventCalcService.calculateBudget({
        eventType: plan.eventType as EventType,
        budget: plan.budget,
        guestCount: plan.guestCount,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        plan,
        calculations,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ planId: plan.id }, 'Event plan created');

    res.status(201).json(response);
  })
);

/**
 * GET /planning/plans
 * Get user's event plans
 */
router.get(
  '/plans',
  authenticateJWT,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    logger.debug({ userId }, 'Fetching event plans');

    const plans = await EventPlanModel.findByUserId(userId);

    const response: ApiResponse = {
      success: true,
      data: plans,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * GET /planning/plans/:id
 * Get a specific event plan
 */
router.get(
  '/plans/:id',
  authenticateJWT,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    logger.debug({ planId: id, userId }, 'Fetching event plan');

    const plan = await EventPlanModel.findById(id);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event plan not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (plan.userId !== userId) {
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

    // Calculate budget if available
    let calculations = undefined;
    if (plan.budget && plan.guestCount) {
      calculations = eventCalcService.calculateBudget({
        eventType: plan.eventType as EventType,
        budget: plan.budget,
        guestCount: plan.guestCount,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        plan,
        calculations,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * PATCH /planning/plans/:id
 * Update an event plan
 */
router.patch(
  '/plans/:id',
  authenticateJWT,
  validateParams(idParamSchema),
  validateBody(updatePlanSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;
    const updates = req.body;

    logger.info({ planId: id, userId }, 'Updating event plan');

    const existingPlan = await EventPlanModel.findById(id);

    if (!existingPlan) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event plan not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (existingPlan.userId !== userId) {
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

    // Convert event date string to Date if provided
    const eventDate = updates.eventDate ? new Date(updates.eventDate) : undefined;

    const plan = await EventPlanModel.update(id, {
      ...updates,
      eventDate,
    });

    const response: ApiResponse = {
      success: true,
      data: plan,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * POST /planning/plans/:id/timeline
 * Generate timeline for an event plan
 */
router.post(
  '/plans/:id/timeline',
  authenticateJWT,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    logger.info({ planId: id, userId }, 'Generating timeline');

    const plan = await EventPlanModel.findById(id);

    if (!plan || plan.userId !== userId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event plan not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const timeline = await planningEngine.generateTimeline({
      conversationId: plan.conversationId,
      userId: plan.userId,
      eventType: plan.eventType as EventType,
      budget: plan.budget || undefined,
      guestCount: plan.guestCount || undefined,
      eventDate: plan.eventDate || undefined,
      location: plan.location || undefined,
    });

    // Update plan with timeline
    await EventPlanModel.update(id, { timeline });

    const response: ApiResponse = {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * POST /planning/plans/:id/checklist
 * Generate checklist for an event plan
 */
router.post(
  '/plans/:id/checklist',
  authenticateJWT,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.userId!;

    logger.info({ planId: id, userId }, 'Generating checklist');

    const plan = await EventPlanModel.findById(id);

    if (!plan || plan.userId !== userId) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Event plan not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const checklist = await planningEngine.generateChecklist({
      conversationId: plan.conversationId,
      userId: plan.userId,
      eventType: plan.eventType as EventType,
      budget: plan.budget || undefined,
      guestCount: plan.guestCount || undefined,
      eventDate: plan.eventDate || undefined,
      location: plan.location || undefined,
    });

    // Update plan with checklist
    await EventPlanModel.update(id, { checklist });

    const response: ApiResponse = {
      success: true,
      data: checklist,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

export default router;
