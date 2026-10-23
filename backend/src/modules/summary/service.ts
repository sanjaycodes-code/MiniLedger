import { prisma } from '../../db';
import { todayUtc } from '../../lib/dates';

export interface SummaryCounts {
  total: number;
  open: number;
  repaid: number;
  overdue: number;
}

export interface SummaryResponse {
  totalLentMinor: number;
  totalRepaidMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  counts: SummaryCounts;
}

export async function getSummary(
  userId: string,
  today: Date = todayUtc(),
): Promise<SummaryResponse> {
  const [allAgg, repaidAgg, overdueAgg, openCount] = await prisma.$transaction([
    prisma.loan.aggregate({
      where: { userId },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.loan.aggregate({
      where: { userId, repaidAt: { not: null } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.loan.aggregate({
      where: { userId, repaidAt: null, dueDate: { lt: today } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.loan.count({
      where: { userId, repaidAt: null, dueDate: { gte: today } },
    }),
  ]);

  const totalLentMinor = allAgg._sum.amountMinor ?? 0;
  const totalRepaidMinor = repaidAgg._sum.amountMinor ?? 0;
  const outstandingMinor = totalLentMinor - totalRepaidMinor;
  const overdueMinor = overdueAgg._sum.amountMinor ?? 0;

  return {
    totalLentMinor,
    totalRepaidMinor,
    outstandingMinor,
    overdueMinor,
    counts: {
      total: allAgg._count._all,
      open: openCount,
      repaid: repaidAgg._count._all,
      overdue: overdueAgg._count._all,
    },
  };
}
