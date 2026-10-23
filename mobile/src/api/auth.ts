import { apiFetch } from './client';
import { AuthResponse } from './types';

export interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return apiFetch<RequestOtpResponse>('/auth/request-otp', {
    method: 'POST',
    body: { phone },
    auth: false,
  });
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp },
    auth: false,
  });
}
