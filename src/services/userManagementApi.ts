import axiosClient from '@/lib/axiosClient';
import { normalizeRoles } from '@/lib/auth';
export interface UserResponse {
  id: number; keycloakId: string; fullName: string; email: string; phoneNumber: string; address: string; status: boolean; roles?: string[];
}
export const userManagementApi = {
  getAll: async (): Promise<UserResponse[]> => {
    const users = await axiosClient.get<UserResponse[], UserResponse[]>('/api/user');
    return users.map((user) => ({ ...user, roles: normalizeRoles(user.roles) }));
  },
  updateStatus: (id: number, enabled: boolean): Promise<UserResponse> =>
    axiosClient.patch<UserResponse, UserResponse>(`/api/user/admin/${id}/status`, { enabled }),
};
