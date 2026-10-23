import { NextFunction, Request, Response } from 'express';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const cleanPath = (req.originalUrl || req.url).split('?')[0] ?? req.path;
    console.log(
      `${req.method} ${cleanPath} ${res.statusCode} ${Math.round(durationMs)}ms`,
    );
  });

  next();
}
