import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { unauthorized } from '../errors';

interface JwtPayloadShape {
  sub?: unknown;
  phone?: unknown;
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice('Bearer '.length).trim();
  } else if (req.method === 'GET' && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    next(unauthorized('Missing or invalid token', 'UNAUTHORIZED'));
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (typeof decoded !== 'object' || decoded === null) {
      next(unauthorized('Missing or invalid token', 'UNAUTHORIZED'));
      return;
    }

    const payload = decoded as JwtPayloadShape;
    if (typeof payload.sub !== 'string' || typeof payload.phone !== 'string') {
      next(unauthorized('Missing or invalid token', 'UNAUTHORIZED'));
      return;
    }

    req.user = {
      id: payload.sub,
      phone: payload.phone,
    };

    next();
  } catch {
    next(unauthorized('Missing or invalid token', 'UNAUTHORIZED'));
  }
}
