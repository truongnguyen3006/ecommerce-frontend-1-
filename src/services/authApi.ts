import axiosClient, { authTransport } from '@/lib/axiosClient';
import { useAuthStore, type UserProfile } from '@/store/useAuthStore';

export interface LoginRequest { username: string; password: string }
export interface RegisterRequest extends LoginRequest { email: string; fullName: string; phoneNumber: string; address: string }
export interface UpdateProfileRequest { fullName?: string; email?: string; phoneNumber?: string; address?: string; password?: string }
export interface KeycloakTokenResponse { access_token: string; refresh_token: string; expires_in: number }
export const authApi = {
  login: async (data: LoginRequest): Promise<KeycloakTokenResponse> =>
    (await authTransport.post<KeycloakTokenResponse>('/auth/login', data)).data,
  register: async (data: RegisterRequest): Promise<UserProfile> =>
    (await authTransport.post<UserProfile>('/auth/register', data)).data,
  getMe: (): Promise<UserProfile> => axiosClient.get<UserProfile, UserProfile>('/api/user/me'),
  updateProfile: (data: UpdateProfileRequest): Promise<UserProfile> => axiosClient.patch<UserProfile, UserProfile>('/api/user/me', data),
  logout: async (): Promise<void> => {
    const refresh = sessionStorage.getItem('refresh_token');
    // End local access immediately; revoke the saved refresh token best-effort.
    useAuthStore.getState().logout();
    if (refresh) await authTransport.post('/auth/logout', new URLSearchParams({ refresh_token: refresh }));
  },
};
