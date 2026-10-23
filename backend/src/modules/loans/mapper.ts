import { Loan } from '@prisma/client';
import { todayUtc, toDateString } from '../../lib/dates';

export type LoanStatus = 'open' | 'repaid' | 'overdue';

export interface LoanDto {
  id: string;
  friendName: string;
  amountMinor: number;
  dueDate: string;
  status: LoanStatus;
  repaidAt: string | null;
  hasReceipt: boolean;
  createdAt: string;
}

export function deriveLoanStatus(loan: Loan, today: Date = todayUtc()): LoanStatus {
  if (loan.repaidAt !== null) {
    return 'repaid';
  }
  if (loan.dueDate.getTime() < today.getTime()) {
    return 'overdue';
  }
  return 'open';
}

export function toLoanDto(loan: Loan, today: Date = todayUtc()): LoanDto {
  return {
    id: loan.id,
    friendName: loan.friendName,
    amountMinor: loan.amountMinor,
    dueDate: toDateString(loan.dueDate),
    status: deriveLoanStatus(loan, today),
    repaidAt: loan.repaidAt ? loan.repaidAt.toISOString() : null,
    hasReceipt: loan.receiptPath !== null,
    createdAt: loan.createdAt.toISOString(),
  };
}
