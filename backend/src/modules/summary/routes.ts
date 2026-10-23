import { Router } from 'express';
import { unauthorized } from '../../errors';
import { todayUtc } from '../../lib/dates';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { summaryQuery } from './schemas';
import { getSummary } from './service';

export const summaryRouter = Router();

summaryRouter.use(requireAuth);

summaryRouter.get(
  '/',
  validate({ query: summaryQuery }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const summary = await getSummary(req.user.id, todayUtc());
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },
);
