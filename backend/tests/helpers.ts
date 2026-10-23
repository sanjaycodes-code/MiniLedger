import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { todayUtc, toDateString } from '../src/lib/dates';

export const app = createApp();

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'WITH d_otps AS (DELETE FROM "OtpCode") DELETE FROM "User"',
  );
}

export interface LoginResult {
  token: string;
  userId: string;
}

export async function loginAs(phone: string): Promise<LoginResult> {
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const token = jwt.sign({ phone: user.phone }, config.JWT_SECRET, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: '7d',
  });

  return {
    token,
    userId: user.id,
  };
}

export function auth(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function relativeDateString(daysOffset: number): string {
  const today = todayUtc();
  const target = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + daysOffset,
    ),
  );
  return toDateString(target);
}
