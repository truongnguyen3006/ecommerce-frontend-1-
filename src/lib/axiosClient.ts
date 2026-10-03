import axios, { type InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/store/useAuthStore';

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number };
type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean; _sessionToken?: string };

// Auth calls bypass the refresh interceptor, preventing circular imports and loops.
export const authTransport = axios.create({ baseURL: '/', timeout: 15_000 });
const axiosClient = axios.create({ baseURL: '/', timeout: 15_000 });
let refreshPromise: Promise<string> | null = null;
function token(): string | null {
  return typeof window === 'undefined' ? null : sessionStorage.getItem('access_token');
}
export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const previousToken = token();
  const refresh = typeof window === 'undefined' ? null : sessionStorage.getItem('refresh_token');
  const pending = (async () => {
    try {
      if (!refresh) throw new Error('Session expired');
      const { data } = await authTransport.post<TokenResponse>('/auth/refresh', { refreshToken: refresh });
      if (!data.access_token || !data.refresh_token) throw new Error('Invalid session response');
      // A late refresh cannot restore an account that logged out or changed.
      if (token() !== previousToken) throw new Error('Session changed');
      sessionStorage.setItem('refresh_token', data.refresh_token);
      useAuthStore.getState().syncToken(data.access_token);
      return data.access_token;
    } catch (error) {
      if (token() === previousToken) useAuthStore.getState().logout();
      throw error;
    }
  })();
  refreshPromise = pending;
  try { return await pending; }
  finally { if (refreshPromise === pending) refreshPromise = null; }
}
export async function freshAccessToken(): Promise<string | null> {
  const access = token();
  if (!access) return null;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(access);
    if (exp && exp * 1000 <= Date.now() + 10_000) return refreshAccessToken();
    return access;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}
axiosClient.interceptors.request.use((config: RetryConfig) => {
  const access = token();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  config._sessionToken = access || undefined;
  return config;
});
axiosClient.interceptors.response.use((response) => response.data, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config) return Promise.reject(error);
  const request = error.config as RetryConfig;
  if (error.response?.status !== 401 || request._retry || !request._sessionToken) return Promise.reject(error);
  request._retry = true;
  try {
    const current = token();
    if (!current) return Promise.reject(error);
    const access = current !== request._sessionToken ? current : await refreshAccessToken();
    // Replay safe reads only. A mutation can have ambiguous side effects.
    if (!['get', 'head', 'options'].includes((request.method || 'get').toLowerCase())) return Promise.reject(error);
    request.headers.Authorization = `Bearer ${access}`;
    return axiosClient(request);
  } catch {
    return Promise.reject(error);
  }
});
export default axiosClient;
