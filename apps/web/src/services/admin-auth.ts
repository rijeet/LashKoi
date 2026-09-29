import { apiRequest } from '@/services/api-client';
import {
  clearAuthTokens,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/services/auth-store';

export type AdminUser = {
  id: string;
  email: string;
  role: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: AdminUser;
};

export async function adminLogin(email: string, password: string) {
  const data = await apiRequest<LoginResult>('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function adminRefresh(): Promise<LoginResult | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const data = await apiRequest<LoginResult>('/admin/auth/refresh', {
    method: 'POST',
    token: refresh,
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function adminMe() {
  return apiRequest<AdminUser>('/admin/auth/me', { auth: true });
}

export async function adminLogout() {
  const refresh = getRefreshToken();
  try {
    await apiRequest<{ ok: boolean }>('/admin/auth/logout', {
      method: 'POST',
      auth: true,
      headers: refresh ? { 'X-Refresh-Token': refresh } : {},
    });
  } finally {
    clearAuthTokens();
  }
}
