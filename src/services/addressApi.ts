import axiosClient from '@/lib/axiosClient';
export interface UserAddress {
  id: number; label?: string; recipientName: string; recipientPhone: string; addressLine: string; isDefault: boolean;
}
export type UserAddressRequest = Omit<UserAddress, 'id'>;
export const addressApi = {
  getMyAddresses: (): Promise<UserAddress[]> => axiosClient.get<UserAddress[], UserAddress[]>('/api/user/addresses'),
  createAddress: (data: UserAddressRequest): Promise<UserAddress> => axiosClient.post<UserAddress, UserAddress>('/api/user/addresses', data),
  updateAddress: (id: number, data: UserAddressRequest): Promise<UserAddress> => axiosClient.put<UserAddress, UserAddress>(`/api/user/addresses/${id}`, data),
  setDefaultAddress: (id: number): Promise<UserAddress> => axiosClient.patch<UserAddress, UserAddress>(`/api/user/addresses/${id}/default`),
  deleteAddress: (id: number): Promise<void> => axiosClient.delete<void, void>(`/api/user/addresses/${id}`),
};
