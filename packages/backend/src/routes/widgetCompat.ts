import { Router, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';

interface WidgetCompatOptions {
  corsOptions: CorsOptions;
  diagnostics: Record<string, unknown>;
}

export function createWidgetCompatRouter({ corsOptions, diagnostics }: WidgetCompatOptions): Router {
  const router = Router();

  router.use(cors(corsOptions));

  router.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `${req.method} is not supported on /api/widget/chat. Use POST for chat messages.`,
        },
        allowedMethods: ['OPTIONS', 'POST'],
        ...diagnostics,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  });

  return router;
}

export function createWidgetFallbackRouter({ corsOptions, diagnostics }: WidgetCompatOptions): Router {
  const router = Router();

  router.use(cors(corsOptions));

  router.all('/', (req: Request, res: Response) => {
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `${req.method} is not supported on /api/widget/chat. Use POST for chat messages.`,
        },
        allowedMethods: ['OPTIONS', 'POST'],
        ...diagnostics,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(503).json({
      success: false,
      error: {
        code: 'WIDGET_CHAT_ROUTE_NOT_MOUNTED',
        message: 'The JadeAssist backend is running, but the widget chat route did not mount correctly.',
      },
      ...diagnostics,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
