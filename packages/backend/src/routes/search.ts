/**
 * Unified public search route for JadeAssist.
 *
 * Returns EventFlow website-index results plus local/catalog supplier results.
 * This is intentionally lightweight and safe for widget use.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/errorHandler';
import { searchService } from '../services/searchService';

const router = Router();

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many search requests. Please wait and try again.',
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

router.get(
  '/',
  searchLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = searchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: 'Search requires a non-empty q parameter, with optional category, location and limit.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const results = await searchService.search({
      query: parsed.data.q,
      category: parsed.data.category,
      location: parsed.data.location,
      limit: parsed.data.limit ? parseInt(parsed.data.limit, 10) : undefined,
    });

    res.json({
      success: true,
      data: {
        query: parsed.data.q,
        count: results.length,
        items: results,
      },
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
