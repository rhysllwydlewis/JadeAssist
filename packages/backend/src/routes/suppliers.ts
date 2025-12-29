/**
 * Supplier routes - Supplier messaging and integration
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { SupplierModel } from '../models/Supplier';
import { eventFlowService } from '../services/eventFlowService';
import { ApiResponse } from '@jadeassist/shared';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const messageSupplierSchema = z.object({
  eventType: z.string(),
  message: z.string().optional(),
});

/**
 * GET /suppliers/:id
 * Get supplier details
 */
router.get(
  '/:id',
  authenticateJWT,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    logger.debug({ supplierId: id }, 'Fetching supplier details');

    const supplier = await SupplierModel.findById(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: supplier,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * POST /suppliers/:id/message
 * Initiate messaging with supplier via EventFlow
 */
router.post(
  '/:id/message',
  authenticateJWT,
  validateParams(idParamSchema),
  validateBody(messageSupplierSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { eventType, message } = req.body as z.infer<typeof messageSupplierSchema>;
    const userId = req.userId!;

    logger.info({ supplierId: id, userId }, 'Initiating supplier messaging');

    // Check if supplier exists
    const supplier = await SupplierModel.findById(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Supplier not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Generate messaging URL via EventFlow
    const messagingInfo = eventFlowService.initiateSupplierMessaging({
      supplierId: id,
      userId,
      eventType,
      message,
    });

    // Track the interaction for analytics
    await eventFlowService.trackEvent('supplier_message_initiated', {
      supplierId: id,
      supplierName: supplier.name,
      supplierCategory: supplier.category,
      userId,
      eventType,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        messagingUrl: messagingInfo.messagingUrl,
        supplier: {
          id: supplier.id,
          name: supplier.name,
          category: supplier.category,
        },
      },
      timestamp: new Date().toISOString(),
    };

    logger.info({ messagingUrl: messagingInfo.messagingUrl }, 'Supplier messaging initiated');

    res.status(200).json(response);
  })
);

export default router;
