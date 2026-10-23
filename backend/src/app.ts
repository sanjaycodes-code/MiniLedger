import cors from 'cors';
import express, { Express, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config, normalizeOrigin } from './config';
import { prisma } from './db';
import { AppError } from './errors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { requestLogger } from './middleware/requestLogger';
import { authRouter } from './modules/auth/routes';
import { loansRouter } from './modules/loans/routes';
import { summaryRouter } from './modules/summary/routes';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function sendRateLimitResponse(res: Response, message: string): void {
  const retryAfterHeader = res.getHeader('Retry-After');
  const retryAfterSeconds =
    retryAfterHeader !== undefined
      ? Number(retryAfterHeader)
      : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
  res.setHeader(
    'Retry-After',
    String(
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    ),
  );
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message,
    },
  });
}

function shouldSkipRateLimit(_req: Request): boolean {
  return config.NODE_ENV === 'test';
}

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = new Set<string>(
    config.CORS_ORIGINS.map(normalizeOrigin),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalized = normalizeOrigin(origin);
        if (allowedOrigins.has(normalized)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      allowedHeaders: ['Authorization', 'Content-Type'],
      methods: ['GET', 'POST', 'OPTIONS'],
      maxAge: 600,
    }),
  );

  app.use(requestLogger);
  app.use(express.json({ limit: '100kb' }));

  const globalApiLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkipRateLimit(req) || req.path === '/health',
    handler: (_req, res) => {
      sendRateLimitResponse(res, 'Too many requests, please try again later');
    },
  });

  const authOtpLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    handler: (_req, res) => {
      sendRateLimitResponse(
        res,
        'Too many authentication attempts, please try again later',
      );
    },
  });

  const v1Router = Router();

  v1Router.get('/health', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', db: 'up' });
    } catch {
      next(new AppError(503, 'INTERNAL_ERROR', 'Database unavailable'));
    }
  });

  v1Router.use(globalApiLimiter);

  v1Router.post('/auth/request-otp', authOtpLimiter);
  v1Router.post('/auth/verify-otp', authOtpLimiter);

  v1Router.use('/auth', authRouter);
  v1Router.use('/summary', summaryRouter);
  v1Router.use('/loans', loansRouter);

  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
