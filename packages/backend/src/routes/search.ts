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
const allowedMethods = ['GET', 'HEAD', 'OPTIONS'] as const;

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many search requests. Please wait and try again.',
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80).optional(),
  location: z.string().trim().min(1).max(120).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

function parseLimit(limit: string | undefined): number | undefined {
  if (!limit) return undefined;
  const parsed = parseInt(limit, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 20);
}

router.options('/', (_req: Request, res: Response) => {
  res.set('Allow', allowedMethods.join(', ')).sendStatus(204);
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
      limit: parseLimit(parsed.data.limit),
    });

    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

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

router.all('/', (req: Request, res: Response) => {
  res.set('Allow', allowedMethods.join(', '));
  res.status(405).json({
    success: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `${req.method} is not supported on /api/search. Use GET.`,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
