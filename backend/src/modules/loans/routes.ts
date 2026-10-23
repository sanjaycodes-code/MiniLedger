import { Router } from 'express';
import { unauthorized } from '../../errors';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getLoanReceiptHandler,
  loadOwnedLoan,
  uploadLoanReceiptHandler,
  uploadReceiptMiddleware,
} from './receipts';
import {
  CreateLoanBody,
  createLoanBody,
  ListLoansQuery,
  listLoansQuery,
  LoanIdParams,
  loanIdParams,
  repayLoanBody,
} from './schemas';
import { createLoan, getLoan, listLoans, repayLoan } from './service';

export const loansRouter = Router();

loansRouter.use(requireAuth);

loansRouter.post(
  '/',
  validate({ body: createLoanBody }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const body = req.body as CreateLoanBody;
      const loan = await createLoan(req.user.id, body);
      res.status(201).json({ loan });
    } catch (err) {
      next(err);
    }
  },
);

loansRouter.get(
  '/',
  validate({ query: listLoansQuery }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const { status } = req.query as unknown as ListLoansQuery;
      const loans = await listLoans(req.user.id, status);
      res.status(200).json({ loans });
    } catch (err) {
      next(err);
    }
  },
);

loansRouter.get(
  '/:id',
  validate({ params: loanIdParams }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const { id } = req.params as unknown as LoanIdParams;
      const loan = await getLoan(req.user.id, id);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  },
);

loansRouter.post(
  '/:id/repay',
  validate({ params: loanIdParams, body: repayLoanBody }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
      }
      const { id } = req.params as unknown as LoanIdParams;
      const loan = await repayLoan(req.user.id, id);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  },
);

loansRouter.post(
  '/:id/receipt',
  loadOwnedLoan,
  uploadReceiptMiddleware,
  uploadLoanReceiptHandler,
);

loansRouter.get('/:id/receipt', loadOwnedLoan, getLoanReceiptHandler);
