import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const OTP_REGEX = /^\d{6}$/;

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    PORT: z.coerce.number().int().positive().default(4000),
    UPLOAD_DIR: z.string().min(1).default('uploads'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((val, ctx) => {
        const raw =
          val !== undefined
            ? val
            : process.env.NODE_ENV === 'production'
              ? ''
              : 'http://localhost:8081,http://localhost:19006,http://localhost:3000';
        const origins = raw
          .split(',')
          .map(normalizeOrigin)
          .filter((origin) => origin.length > 0);
        if (origins.length === 0 && process.env.NODE_ENV === 'production') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'CORS_ORIGINS must not be empty in production',
          });
        }
        return origins;
      }),
    DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((val) => val === 'true'),
    DEMO_PHONE: z
      .string()
      .regex(PHONE_REGEX, 'DEMO_PHONE must be a valid E.164 phone number')
      .default('+919999999999'),
    DEMO_OTP: z
      .string()
      .regex(OTP_REGEX, 'DEMO_OTP must be a 6-digit code')
      .default('123456'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 32 characters in production',
        });
      }
      if (data.CORS_ORIGINS.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGINS'],
          message: 'CORS_ORIGINS must contain at least one explicit origin in production',
        });
      }
      for (const origin of data.CORS_ORIGINS) {
        if (origin === '*' || origin.includes('*')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'CORS_ORIGINS must not contain "*" in production',
          });
        }
        if (/localhost|127\.0\.0\.1/i.test(origin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'CORS_ORIGINS must not contain localhost in production',
          });
        }
      }
    }
  });

export type Config = z.infer<typeof envSchema>;

export function parseConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`[Config Error] Invalid environment variables:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const config: Config = parseConfig();
