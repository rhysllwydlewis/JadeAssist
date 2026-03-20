/**
 * Request-ID middleware
 * Attaches a unique request ID to every incoming request and response.
 */
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Reads X-Request-Id from incoming headers (propagation) or generates a new UUID.
 * Sets res.locals.requestId and echoes it back as X-Request-Id on the response.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.trim().length > 0 ? incoming.trim() : randomUUID();

  res.locals['requestId'] = id;
  res.setHeader('X-Request-Id', id);
  next();
};
