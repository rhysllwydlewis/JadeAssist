/**
 * GET /api/catalog/*
 *
 * Protected proxy routes to the EventFlow catalog API.
 * JadeAssist calls these endpoints and forwards the results to the widget or
 * planning engine.  Requests to EventFlow are authenticated via
 * X-Catalog-Api-Key (server-side only — the key is never exposed to clients).
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { catalogService } from '../services/catalogService';
import { logger } from '../utils/logger';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function notConfiguredResponse(res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      code: 'CATALOG_NOT_CONFIGURED',
      message:
        'EventFlow catalog integration is not configured. ' +
        'Set EVENTFLOW_CATALOG_BASE_URL and EVENTFLOW_CATALOG_API_KEY to enable this feature.',
    },
    timestamp: new Date().toISOString(),
  });
}

// ── Venues ────────────────────────────────────────────────────────────────────

const venueQuerySchema = z.object({
  location: z.string().optional(),
  capacity: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
});

/**
 * GET /api/catalog/venues
 * List venues from the EventFlow catalog.
 */
router.get(
  '/venues',
  asyncHandler(async (req: Request, res: Response) => {
    if (!catalogService.isConfigured) {
      notConfiguredResponse(res);
      return;
    }

    const query = venueQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const venues = await catalogService.listVenues({
      location: query.data.location,
      capacity: query.data.capacity !== undefined ? parseInt(query.data.capacity, 10) : undefined,
      page: query.data.page !== undefined ? parseInt(query.data.page, 10) : undefined,
      pageSize:
        query.data.pageSize !== undefined ? parseInt(query.data.pageSize, 10) : undefined,
    });

    logger.info({ count: venues.items?.length ?? 0 }, 'catalog venues fetched');

    res.json({ success: true, data: venues, timestamp: new Date().toISOString() });
  }),
);

/**
 * GET /api/catalog/venues/:id
 * Get a single venue by ID.
 */
router.get(
  '/venues/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!catalogService.isConfigured) {
      notConfiguredResponse(res);
      return;
    }

    const venue = await catalogService.getVenue(req.params['id'] ?? '');
    res.json({ success: true, data: venue, timestamp: new Date().toISOString() });
  }),
);

// ── Suppliers ─────────────────────────────────────────────────────────────────

const supplierQuerySchema = z.object({
  category: z.string().optional(),
  location: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
});

/**
 * GET /api/catalog/suppliers
 * List suppliers from the EventFlow catalog.
 */
router.get(
  '/suppliers',
  asyncHandler(async (req: Request, res: Response) => {
    if (!catalogService.isConfigured) {
      notConfiguredResponse(res);
      return;
    }

    const query = supplierQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Invalid query parameters' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const suppliers = await catalogService.listSuppliers({
      category: query.data.category,
      location: query.data.location,
      page: query.data.page !== undefined ? parseInt(query.data.page, 10) : undefined,
      pageSize:
        query.data.pageSize !== undefined ? parseInt(query.data.pageSize, 10) : undefined,
    });

    logger.info({ count: suppliers.items?.length ?? 0 }, 'catalog suppliers fetched');

    res.json({ success: true, data: suppliers, timestamp: new Date().toISOString() });
  }),
);

/**
 * GET /api/catalog/suppliers/:id
 * Get a single supplier by ID.
 */
router.get(
  '/suppliers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!catalogService.isConfigured) {
      notConfiguredResponse(res);
      return;
    }

    const supplier = await catalogService.getSupplier(req.params['id'] ?? '');
    res.json({ success: true, data: supplier, timestamp: new Date().toISOString() });
  }),
);

// ── Health ────────────────────────────────────────────────────────────────────

/**
 * GET /api/catalog/health
 * Check whether the catalog API connection is healthy.
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    if (!catalogService.isConfigured) {
      res.json({
        success: true,
        data: { status: 'unconfigured', configured: false },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const healthy = await catalogService.healthCheck();
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: { status: healthy ? 'ok' : 'error', configured: true },
      timestamp: new Date().toISOString(),
    });
  }),
);

export default router;
