import { Router } from 'express';
import { unauthorized } from '../../errors';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  authMeQuery,
  RequestOtpBody,
  requestOtpBody,
  VerifyOtpBody,
  verifyOtpBody,
} from './schemas';
import { getAuthenticatedUser, requestOtp, verifyOtp } from './service';

export const authRouter = Router();

authRouter.post(
  '/request-otp',
  validate({ body: requestOtpBody }),
  async (req, res, next) => {
    try {
      const { phone } = req.body as RequestOtpBody;
      const result = await requestOtp(phone);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/verify-otp',
  validate({ body: verifyOtpBody }),
  async (req, res, next) => {
    try {
      const { phone, otp } = req.body as VerifyOtpBody;
      const result = await verifyOtp(phone, otp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.get(
  '/me',
  requireAuth,
  validate({ query: authMeQuery }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const user = await getAuthenticatedUser(req.user.id);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },
);
