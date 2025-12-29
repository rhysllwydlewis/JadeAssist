/**
 * Planning routes - Event planning endpoints
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { EventPlanModel, CreateEventPlanParams, UpdateEventPlanParams } from '../models/EventPlan';
import { eventCalcService } from '../services/eventCalcService';
import { planningEngine } from '../services/planningEngine';
import { analyticsService } from '../services/analyticsService';
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

    // Track plan creation
    await analyticsService.trackPlanCreated(
      userId,
      plan.id,
      plan.eventType,
      plan.budget || undefined,
      plan.guestCount || undefined
    );

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-redundant-type-constituents
    const updates = req.body as UpdateEventPlanParams & { eventDate?: string };

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    const eventDate = updates.eventDate ? new Date(updates.eventDate) : undefined;

    const plan = await EventPlanModel.update(id, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      budget: updates.budget,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      guestCount: updates.guestCount,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      location: updates.location,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      postcode: updates.postcode,
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

/**
 * POST /planning/estimate-budget
 * Dynamic budget calculator
 */
const estimateBudgetSchema = z.object({
  eventType: z.enum([
    'wedding',
    'birthday',
    'corporate',
    'conference',
    'party',
    'anniversary',
    'other',
  ]),
  guestCount: z.number().int().positive(),
  eventDate: z.string().datetime(),
  location: z.string(),
  includeVenue: z.boolean().default(true),
  includeCatering: z.boolean().default(true),
  includeEntertainment: z.boolean().default(true),
});

router.post(
  '/estimate-budget',
  validateBody(estimateBudgetSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      eventType,
      guestCount,
      // eventDate and location are provided but not currently used in calculation
      // They may be used for future seasonal pricing or location-based adjustments
      includeVenue,
      includeCatering,
      includeEntertainment,
    } = req.body as z.infer<typeof estimateBudgetSchema>;

    logger.info({ eventType, guestCount }, 'Estimating budget');

    // Calculate base budget estimate
    const estimatedBudget = eventCalcService.estimateBudget(eventType as EventType, guestCount);

    // Calculate detailed breakdown
    const calculations = eventCalcService.calculateBudget({
      eventType: eventType as EventType,
      budget: estimatedBudget,
      guestCount,
    });

    // Adjust based on inclusions
    let adjustedTotal = estimatedBudget;
    const breakdown: Record<string, number> = {};

    calculations.allocations.forEach((allocation) => {
      const category = allocation.category.toLowerCase();
      let amount = allocation.amount;

      // Exclude categories if not included
      if (!includeVenue && category === 'venue') {
        amount = 0;
        adjustedTotal -= allocation.amount;
      }
      if (!includeCatering && category === 'catering') {
        amount = 0;
        adjustedTotal -= allocation.amount;
      }
      if (!includeEntertainment && category === 'entertainment') {
        amount = 0;
        adjustedTotal -= allocation.amount;
      }

      breakdown[allocation.category] = Math.round(amount * 100) / 100;
    });

    // Generate savings tips
    const savings = await Promise.resolve([
      { tip: 'Book during off-peak season', savings: Math.round(adjustedTotal * 0.15) },
      { tip: 'Choose a weekday instead of weekend', savings: Math.round(adjustedTotal * 0.2) },
      { tip: 'Reduce guest count by 10%', savings: Math.round(adjustedTotal * 0.1) },
      { tip: 'Use in-house suppliers', savings: Math.round(adjustedTotal * 0.12) },
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        breakdown,
        total: Math.round(adjustedTotal * 100) / 100,
        savings,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ total: adjustedTotal }, 'Budget estimated');

    res.status(200).json(response);
  })
);

/**
 * POST /planning/suggest-suppliers
 * Supplier matching based on criteria
 */
const suggestSuppliersSchema = z.object({
  eventType: z.enum([
    'wedding',
    'birthday',
    'corporate',
    'conference',
    'party',
    'anniversary',
    'other',
  ]),
  category: z.string(),
  postcode: z.string(),
  budget: z.number().positive(),
  guestCount: z.number().int().positive(),
  preferences: z.record(z.unknown()).optional(),
});

router.post(
  '/suggest-suppliers',
  validateBody(suggestSuppliersSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventType, category, postcode, budget, guestCount, preferences } = req.body as z.infer<
      typeof suggestSuppliersSchema
    >;

    logger.info({ eventType, category, postcode }, 'Suggesting suppliers');

    // Get suppliers from planning engine
    const suppliers = await planningEngine.suggestSuppliers({
      eventType: eventType as EventType,
      category,
      postcode,
      budget,
      guestCount,
      preferences,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        suppliers,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ count: suppliers.length }, 'Suppliers suggested');

    res.status(200).json(response);
  })
);

/**
 * POST /planning/build-timeline
 * Generate event timeline
 */
const buildTimelineSchema = z.object({
  eventType: z.enum([
    'wedding',
    'birthday',
    'corporate',
    'conference',
    'party',
    'anniversary',
    'other',
  ]),
  eventDate: z.string().datetime(),
  guestCount: z.number().int().positive(),
  complexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
});

router.post(
  '/build-timeline',
  validateBody(buildTimelineSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventType, eventDate, guestCount, complexity } = req.body as z.infer<
      typeof buildTimelineSchema
    >;

    logger.info({ eventType, eventDate, complexity }, 'Building timeline');

    const timeline = await planningEngine.buildTimeline({
      eventType: eventType as EventType,
      eventDate: new Date(eventDate),
      guestCount,
      complexity,
    });

    const response: ApiResponse = {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString(),
    };

    logger.info({ totalTasks: timeline.totalTasks }, 'Timeline built');

    res.status(200).json(response);
  })
);

/**
 * POST /planning/create-checklist
 * Generate event checklist
 */
const createChecklistSchema = z.object({
  eventType: z.enum([
    'wedding',
    'birthday',
    'corporate',
    'conference',
    'party',
    'anniversary',
    'other',
  ]),
  guestCount: z.number().int().positive(),
  venue: z.string().optional(),
  includeVenue: z.boolean().default(true),
  includeDecor: z.boolean().default(true),
  includeFood: z.boolean().default(true),
  includeMusic: z.boolean().default(true),
});

router.post(
  '/create-checklist',
  validateBody(createChecklistSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      eventType,
      guestCount,
      venue,
      includeVenue,
      includeDecor,
      includeFood,
      includeMusic,
    } = req.body as z.infer<typeof createChecklistSchema>;

    logger.info({ eventType, guestCount }, 'Creating checklist');

    const checklist = await planningEngine.createChecklist({
      eventType: eventType as EventType,
      guestCount,
      venue,
      includeVenue,
      includeDecor,
      includeFood,
      includeMusic,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        checklist,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ categories: checklist.length }, 'Checklist created');

    res.status(200).json(response);
  })
);

export default router;
