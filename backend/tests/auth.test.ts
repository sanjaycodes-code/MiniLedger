import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { prisma } from '../src/db';
import { app, auth, loginAs, resetDb } from './helpers';

const mutableConfig = config as {
  DEMO_MODE: boolean;
  DEMO_PHONE: string;
  DEMO_OTP: string;
};

describe('Auth API (/api/v1/auth)', () => {
  beforeEach(async () => {
    mutableConfig.DEMO_MODE = false;
    mutableConfig.DEMO_PHONE = '+919999999999';
    mutableConfig.DEMO_OTP = '123456';
    await resetDb();
  });

  afterEach(() => {
    mutableConfig.DEMO_MODE = false;
    mutableConfig.DEMO_PHONE = '+919999999999';
    mutableConfig.DEMO_OTP = '123456';
  });

  it('sets helmet security headers and removes x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('completes request-otp and verify-otp happy path', async () => {
    const phone = '+919876543210';

    const reqRes = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone });

    expect(reqRes.status).toBe(200);
    expect(reqRes.body).toEqual({
      message: 'OTP sent',
      expiresInSeconds: 300,
    });

    const otpRecord = await prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    expect(otpRecord).not.toBeNull();

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: otpRecord!.code });

    expect(verifyRes.status).toBe(200);
    expect(typeof verifyRes.body.token).toBe('string');
    expect(verifyRes.body.user).toMatchObject({ phone });
  });

  it('returns 401 INVALID_OTP when given a wrong OTP', async () => {
    const phone = '+919876543211';
    await request(app).post('/api/v1/auth/request-otp').send({ phone });

    const otpRecord = await prisma.otpCode.findFirstOrThrow({
      where: { phone },
    });
    const wrongOtp = otpRecord.code === '000000' ? '111111' : '000000';

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: wrongOtp });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('returns 401 INVALID_OTP when the OTP is expired', async () => {
    const phone = '+919876543212';
    await request(app).post('/api/v1/auth/request-otp').send({ phone });

    const otpRecord = await prisma.otpCode.findFirstOrThrow({
      where: { phone },
    });

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: otpRecord.code });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_OTP');
  });

  it('returns 401 INVALID_OTP when reusing an already-consumed OTP', async () => {
    const phone = '+919876543213';
    await request(app).post('/api/v1/auth/request-otp').send({ phone });

    const otpRecord = await prisma.otpCode.findFirstOrThrow({
      where: { phone },
    });

    const first = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: otpRecord.code });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: otpRecord.code });
    expect(second.status).toBe(401);
    expect(second.body.error.code).toBe('INVALID_OTP');
  });

  it('invalidates the OTP after 5 wrong attempts even if the 6th is correct', async () => {
    const phone = '+919876543214';
    await request(app).post('/api/v1/auth/request-otp').send({ phone });

    const otpRecord = await prisma.otpCode.findFirstOrThrow({
      where: { phone },
    });
    const wrongOtp = otpRecord.code === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      const attempt = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone, otp: wrongOtp });
      expect(attempt.status).toBe(401);
      expect(attempt.body.error.code).toBe('INVALID_OTP');
    }

    const sixthWithRealCode = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: otpRecord.code });

    expect(sixthWithRealCode.status).toBe(401);
    expect(sixthWithRealCode.body.error.code).toBe('INVALID_OTP');
  });

  it('rate-limits a second request-otp within 30s with 429 RATE_LIMITED and Retry-After', async () => {
    const phone = '+919876543215';

    const first = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone });
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMITED');
    expect(second.headers['retry-after']).toBeDefined();
    expect(Number(second.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  });

  it('returns 400 VALIDATION_ERROR for an invalid phone number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/request-otp')
      .send({ phone: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details?.[0]?.field).toBe('phone');
  });

  it('returns 200 and user profile from GET /auth/me with a valid token', async () => {
    const phone = '+919876543216';
    const { token, userId } = await loginAs(phone);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: userId,
        phone,
      },
    });
  });

  it('returns 401 UNAUTHORIZED from GET /auth/me without a token or with a bad token', async () => {
    const noToken = await request(app).get('/api/v1/auth/me');
    expect(noToken.status).toBe(401);
    expect(noToken.body.error.code).toBe('UNAUTHORIZED');

    const badToken = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(badToken.status).toBe(401);
    expect(badToken.body.error.code).toBe('UNAUTHORIZED');
  });

  describe('Demo mode (DEMO_MODE=true)', () => {
    it('accepts fixed DEMO_OTP for DEMO_PHONE and skips 30s per-phone cooldown when DEMO_MODE=true', async () => {
      mutableConfig.DEMO_MODE = true;
      const demoPhone = '+919999999999';

      const req1 = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: demoPhone });
      expect(req1.status).toBe(200);

      const req2 = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: demoPhone });
      expect(req2.status).toBe(200);

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: demoPhone, otp: '123456' });

      expect(verifyRes.status).toBe(200);
      expect(typeof verifyRes.body.token).toBe('string');
      expect(verifyRes.body.user.phone).toBe(demoPhone);
    });

    it('rejects DEMO_OTP (123456) for a non-demo phone even when DEMO_MODE=true', async () => {
      mutableConfig.DEMO_MODE = true;
      const otherPhone = '+919876543299';

      await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: otherPhone });

      const otpRecord = await prisma.otpCode.findFirstOrThrow({
        where: { phone: otherPhone, consumedAt: null },
      });
      if (otpRecord.code === '123456') {
        await prisma.otpCode.update({
          where: { id: otpRecord.id },
          data: { code: '654321' },
        });
      }

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: otherPhone, otp: '123456' });

      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.error.code).toBe('INVALID_OTP');
    });

    it('does not lock out DEMO_PHONE after 5 wrong OTP attempts when DEMO_MODE=true', async () => {
      mutableConfig.DEMO_MODE = true;
      const demoPhone = '+919999999999';

      await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: demoPhone });

      for (let i = 0; i < 5; i++) {
        const wrongAttempt = await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ phone: demoPhone, otp: '000000' });
        expect(wrongAttempt.status).toBe(401);
        expect(wrongAttempt.body.error.code).toBe('INVALID_OTP');
      }

      const sixthWithDemoOtp = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: demoPhone, otp: '123456' });

      expect(sixthWithDemoOtp.status).toBe(200);
      expect(typeof sixthWithDemoOtp.body.token).toBe('string');
    });

    it('treats DEMO_PHONE like any normal phone when DEMO_MODE=false', async () => {
      mutableConfig.DEMO_MODE = false;
      const demoPhone = '+919999999999';

      const firstReq = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: demoPhone });
      expect(firstReq.status).toBe(200);

      const secondReq = await request(app)
        .post('/api/v1/auth/request-otp')
        .send({ phone: demoPhone });
      expect(secondReq.status).toBe(429);
      expect(secondReq.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
