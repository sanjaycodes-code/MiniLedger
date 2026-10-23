export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_OTP'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'ALREADY_REPAID'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetail[];
  public readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: ErrorDetail[],
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function badRequest(
  message: string,
  details?: ErrorDetail[],
): AppError {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

export function unauthorized(
  message = 'Unauthorized',
  code: 'UNAUTHORIZED' | 'INVALID_OTP' = 'UNAUTHORIZED',
): AppError {
  return new AppError(401, code, message);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function conflict(
  message: string,
  code: ErrorCode = 'ALREADY_REPAID',
): AppError {
  return new AppError(409, code, message);
}

export function payloadTooLarge(
  message = 'File exceeds maximum allowed size of 5MB',
): AppError {
  return new AppError(413, 'FILE_TOO_LARGE', message);
}

export function unsupportedMediaType(
  message = 'Unsupported media type; allowed types are JPEG, PNG, and WEBP',
): AppError {
  return new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', message);
}

export function rateLimited(
  message: string,
  retryAfterSeconds: number,
): AppError {
  return new AppError(429, 'RATE_LIMITED', message, undefined, {
    'Retry-After': String(retryAfterSeconds),
  });
}
