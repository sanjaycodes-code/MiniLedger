import { z } from 'zod';
import { isValidDateString } from '../../lib/dates';

export const createLoanBody = z
  .object({
    friendName: z
      .string()
      .trim()
      .min(1, 'friendName is required')
      .max(60, 'friendName must be at most 60 characters'),
    amountMinor: z
      .number()
      .int('amountMinor must be an integer')
      .min(1, 'amountMinor must be at least 1')
      .max(1_000_000_000, 'amountMinor must be at most 1,000,000,000'),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be formatted as YYYY-MM-DD')
      .refine(
        isValidDateString,
        'dueDate must be a valid calendar date not before 2000-01-01',
      ),
  })
  .strict();

export const repayLoanBody = z.object({}).strict();

export const loanFilterStatusEnum = z.enum([
  'all',
  'open',
  'repaid',
  'overdue',
]);

export const listLoansQuery = z
  .object({
    status: loanFilterStatusEnum.default('all'),
  })
  .strict();

export const loanIdParams = z
  .object({
    id: z.string().uuid('Invalid loan id'),
  })
  .strict();

export type CreateLoanBody = z.infer<typeof createLoanBody>;
export type LoanFilterStatus = z.infer<typeof loanFilterStatusEnum>;
export type ListLoansQuery = z.infer<typeof listLoansQuery>;
export type LoanIdParams = z.infer<typeof loanIdParams>;
