import { ApiErrorBody, ApiErrorDetail } from './types';

const rawApiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const API_URL = rawApiUrl.replace(/\/+$/, '');

let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

interface RawHttpResponse {
  ok: boolean;
  status: number;
  text: string;
}

function sendFormDataViaXhr(
  url: string,
  method: string,
  headers: Record<string, string>,
  formData: FormData,
): Promise<RawHttpResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        text: typeof xhr.responseText === 'string' ? xhr.responseText : '',
      });
    };

    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Network request timed out'));
    };

    xhr.send(formData);
  });
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_URL}${normalizedPath}`;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth && currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  let rawResponse: RawHttpResponse;
  try {
    if (isFormData) {
      rawResponse = await sendFormDataViaXhr(url, method, headers, body);
    } else {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      rawResponse = {
        ok: response.ok,
        status: response.status,
        text,
      };
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? `Network error: ${err.message}`
        : 'Unable to reach the server';
    throw new ApiError(0, 'NETWORK_ERROR', message);
  }

  let parsedBody: unknown = null;
  if (rawResponse.text.length > 0) {
    try {
      parsedBody = JSON.parse(rawResponse.text) as unknown;
    } catch {
      parsedBody = null;
    }
  }

  if (!rawResponse.ok) {
    const maybeError = parsedBody as Partial<ApiErrorBody> | null;
    const code = maybeError?.error?.code ?? 'INTERNAL_ERROR';
    const message =
      maybeError?.error?.message ?? `Request failed (${rawResponse.status})`;
    const details = maybeError?.error?.details;

    if (
      rawResponse.status === 401 &&
      code === 'UNAUTHORIZED' &&
      unauthorizedHandler
    ) {
      unauthorizedHandler();
    }

    throw new ApiError(rawResponse.status, code, message, details);
  }

  return parsedBody as T;
}
