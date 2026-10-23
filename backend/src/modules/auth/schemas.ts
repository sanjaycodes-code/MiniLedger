import { z } from 'zod';

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format (e.g. +919876543210)');

const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be a 6-digit number');

export const requestOtpBody = z
  .object({
    phone: phoneSchema,
  })
  .strict();

export const verifyOtpBody = z
  .object({
    phone: phoneSchema,
    otp: otpSchema,
  })
  .strict();

export const authMeQuery = z.object({}).strict();

export type RequestOtpBody = z.infer<typeof requestOtpBody>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBody>;
