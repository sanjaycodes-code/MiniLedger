import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError, ZodIssue } from 'zod';
import { AppError, ErrorDetail, notFound } from '../errors';

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

function isMalformedJsonError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) {
    return false;
  }
  const maybeHttpErr = err as SyntaxError & {
    status?: number;
    statusCode?: number;
    body?: unknown;
  };
  return (
    (maybeHttpErr.status === 400 || maybeHttpErr.statusCode === 400) &&
    'body' in maybeHttpErr
  );
}

function formatIssueField(issue: ZodIssue): string {
  if (issue.path.length > 0) {
    return issue.path.join('.');
  }
  if (issue.code === 'unrecognized_keys' && issue.keys.length > 0) {
    return issue.keys.join('.');
  }
  return 'body';
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (err.headers) {
      for (const [headerName, headerValue] of Object.entries(err.headers)) {
        res.setHeader(headerName, headerValue);
      }
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds maximum allowed size of 5MB',
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: [{ field: err.field ?? 'receipt', message: err.message }],
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const details: ErrorDetail[] = err.issues.map((issue) => ({
      field: formatIssueField(issue),
      message: issue.message,
    }));
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  if (isMalformedJsonError(err)) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON',
      },
    });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
