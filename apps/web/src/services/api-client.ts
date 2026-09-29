import type { ApiEnvelope, ApiErrorShape } from '@/types/api';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/services/auth-store';

export class ApiError extends Error implements ApiErrorShape {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(init: ApiErrorShape) {
    super(init.message);
    this.statusCode = init.statusCode;
    this.code = init.code;
    this.details = init.details;
  }
}

function baseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) throw new Error('VITE_API_BASE_URL is not set');
  return url.replace(/\/$/, '');
}

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
  headers?: Record<string, string>;
};

let refreshFlight: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) return false;
      try {
        const data = await rawRequest<{
          accessToken: string;
          refreshToken: string;
        }>('/admin/auth/refresh', { method: 'POST', token: refresh });
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshFlight = null;
    });
  }
  return refreshFlight;
}

async function rawRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { method = 'GET', query, body, token, headers: extraHeaders } = options;
  const url = new URL(`${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extraHeaders,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const bearer = token ?? (options.auth ? getAccessToken() : null);
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      statusCode: 0,
      code: 'NETWORK',
      message: 'Network request failed',
    });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) {
    if (!res.ok) {
      throw new ApiError({
        statusCode: res.status,
        code: 'HTTP_ERROR',
        message: res.statusText,
      });
    }
    return undefined as T;
  }

  const json = (await res.json()) as ApiEnvelope<T> & {
    error?: { code?: string; details?: unknown };
  };

  if (json.status !== 'success') {
    throw new ApiError({
      statusCode: json.statusCode ?? res.status,
      code: json.error?.code ?? 'API_ERROR',
      message: json.message ?? 'Request failed',
      details: json.error?.details,
    });
  }

  return json.data;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (
      options.auth &&
      err instanceof ApiError &&
      (err.code === 'UNAUTHORIZED' || err.statusCode === 401)
    ) {
      const ok = await runRefresh();
      if (ok) {
        return await rawRequest<T>(path, options);
      }
      setAccessToken(null);
    }
    throw err;
  }
}
