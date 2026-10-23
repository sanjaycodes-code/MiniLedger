import { prisma } from '../src/db';

function utcDatePlusDays(daysOffset: number): Date {
  const now = new Date();
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysOffset,
  );
  return new Date(utcMidnight);
}

async function seedDemoUser(phone: string): Promise<void> {
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  await prisma.loan.deleteMany({
    where: { userId: user.id },
  });

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  await prisma.loan.createMany({
    data: [
      // 2 open loans (due in +5 and +20 days)
      {
        userId: user.id,
        friendName: 'Aarav Sharma',
        amountMinor: 250000, // Rs 2,500.00
        dueDate: utcDatePlusDays(5),
        repaidAt: null,
      },
      {
        userId: user.id,
        friendName: 'Priya Patel',
        amountMinor: 500000, // Rs 5,000.00
        dueDate: utcDatePlusDays(20),
        repaidAt: null,
      },
      // 2 overdue loans (due -3 and -15 days)
      {
        userId: user.id,
        friendName: 'Rohan Verma',
        amountMinor: 120000, // Rs 1,200.00
        dueDate: utcDatePlusDays(-3),
        repaidAt: null,
      },
      {
        userId: user.id,
        friendName: 'Sneha Nair',
        amountMinor: 350000, // Rs 3,500.00
        dueDate: utcDatePlusDays(-15),
        repaidAt: null,
      },
      // 2 repaid loans (repaidAt set)
      {
        userId: user.id,
        friendName: 'Vikram Singh',
        amountMinor: 150000, // Rs 1,500.00
        dueDate: utcDatePlusDays(-10),
        repaidAt: fiveDaysAgo,
      },
      {
        userId: user.id,
        friendName: 'Ananya Gupta',
        amountMinor: 80000, // Rs 800.00
        dueDate: utcDatePlusDays(2),
        repaidAt: twoDaysAgo,
      },
    ],
  });

  console.log(`Seeded user ${user.phone} (${user.id}) with 6 demo loans.`);
}

async function main(): Promise<void> {
  const phonesToSeed = new Set<string>([
    process.env.DEMO_PHONE ?? '+919999999999',
    '+919999999999',
    '+917386038933',
  ]);

  for (const phone of phonesToSeed) {
    await seedDemoUser(phone);
  }
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
