import { Prisma } from '@prisma/client';
import { prisma } from '../../db';
import { conflict, notFound } from '../../errors';
import { parseDateString, todayUtc } from '../../lib/dates';
import { LoanDto, toLoanDto } from './mapper';
import { CreateLoanBody, LoanFilterStatus } from './schemas';

export async function createLoan(
  userId: string,
  input: CreateLoanBody,
): Promise<LoanDto> {
  const today = todayUtc();
  const loan = await prisma.loan.create({
    data: {
      userId,
      friendName: input.friendName,
      amountMinor: input.amountMinor,
      dueDate: parseDateString(input.dueDate),
    },
  });

  return toLoanDto(loan, today);
}

export async function listLoans(
  userId: string,
  status: LoanFilterStatus,
): Promise<LoanDto[]> {
  const today = todayUtc();

  const where: Prisma.LoanWhereInput = { userId };

  if (status === 'open') {
    where.repaidAt = null;
    where.dueDate = { gte: today };
  } else if (status === 'overdue') {
    where.repaidAt = null;
    where.dueDate = { lt: today };
  } else if (status === 'repaid') {
    where.repaidAt = { not: null };
  }

  const loans = await prisma.loan.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  return loans.map((loan) => toLoanDto(loan, today));
}

export async function getLoan(userId: string, id: string): Promise<LoanDto> {
  const loan = await prisma.loan.findFirst({
    where: { id, userId },
  });

  if (!loan) {
    throw notFound('Loan not found');
  }

  return toLoanDto(loan, todayUtc());
}

export async function repayLoan(userId: string, id: string): Promise<LoanDto> {
  const loan = await prisma.loan.findFirst({
    where: { id, userId },
  });

  if (!loan) {
    throw notFound('Loan not found');
  }

  if (loan.repaidAt !== null) {
    throw conflict('Loan already repaid', 'ALREADY_REPAID');
  }

  const updated = await prisma.loan.update({
    where: { id: loan.id },
    data: { repaidAt: new Date() },
  });

  return toLoanDto(updated, todayUtc());
}
