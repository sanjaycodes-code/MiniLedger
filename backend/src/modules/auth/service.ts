import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../db';
import { rateLimited, unauthorized } from '../../errors';

const OTP_EXPIRY_SECONDS = 300;
const OTP_COOLDOWN_MS = 30_000;
const MAX_OTP_ATTEMPTS = 5;

export interface RequestOtpResult {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResult {
  token: string;
  user: {
    id: string;
    phone: string;
  };
}

function isDemoPhone(phone: string): boolean {
  return config.DEMO_MODE && phone === config.DEMO_PHONE;
}

/**
 * Issues a new 6-digit OTP for `phone`.
 * Enforces a 30-second cooldown using the most recent `OtpCode.createdAt`
 * timestamp in the database and invalidates prior unconsumed codes.
 * When `DEMO_MODE=true` and `phone === DEMO_PHONE`, skips the 30s cooldown,
 * stores `DEMO_OTP`, and logs `[DEMO] <phone> accepts fixed OTP`.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  const now = new Date();
  const demo = isDemoPhone(phone);

  if (!demo) {
    const mostRecentOtp = await prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (mostRecentOtp) {
      const elapsedMs = now.getTime() - mostRecentOtp.createdAt.getTime();
      if (elapsedMs < OTP_COOLDOWN_MS) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000),
        );
        throw rateLimited(
          'Please wait before requesting another OTP',
          retryAfterSeconds,
        );
      }
    }
  }

  await prisma.otpCode.updateMany({
    where: {
      phone,
      consumedAt: null,
    },
    data: {
      consumedAt: now,
    },
  });

  const code = demo
    ? config.DEMO_OTP
    : crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
    },
  });

  if (demo) {
    console.log(`[DEMO] ${phone} accepts fixed OTP`);
  } else {
    console.log(`[MOCK OTP] ${phone} -> ${code}`);
  }

  return {
    message: 'OTP sent',
    expiresInSeconds: OTP_EXPIRY_SECONDS,
  };
}

/**
 * Verifies the latest active OTP for `phone`.
 * If the active code has already reached `MAX_OTP_ATTEMPTS` (5), it is marked
 * consumed and rejected even if the supplied OTP matches (except for the demo
 * phone when `DEMO_MODE=true`, so visitors cannot lock the demo account).
 */
export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<VerifyOtpResult> {
  const now = new Date();
  const demo = isDemoPhone(phone);

  const latestOtp = await prisma.otpCode.findFirst({
    where: {
      phone,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestOtp) {
    throw unauthorized('Invalid or expired OTP', 'INVALID_OTP');
  }

  if (!demo && latestOtp.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: latestOtp.id },
      data: { consumedAt: now },
    });
    throw unauthorized('Invalid or expired OTP', 'INVALID_OTP');
  }

  if (latestOtp.code !== otp) {
    if (!demo) {
      await prisma.otpCode.update({
        where: { id: latestOtp.id },
        data: { attempts: { increment: 1 } },
      });
    }
    throw unauthorized('Invalid or expired OTP', 'INVALID_OTP');
  }

  await prisma.otpCode.update({
    where: { id: latestOtp.id },
    data: { consumedAt: now },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  const token = jwt.sign(
    { sub: user.id, phone: user.phone },
    config.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
    },
  );

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
    },
  };
}

export async function getAuthenticatedUser(
  userId: string,
): Promise<{ id: string; phone: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw unauthorized('Missing or invalid token', 'UNAUTHORIZED');
  }

  return {
    id: user.id,
    phone: user.phone,
  };
}
