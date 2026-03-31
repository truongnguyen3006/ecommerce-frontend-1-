import axiosClient from '@/lib/axiosClient';
import { isRecord, readBoolean, readNumber, readString, unwrapCollection } from '@/lib/api-normalizers';

export interface UserAddress {
  id: number;
  label?: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  isDefault: boolean;
}

export interface UserAddressRequest {
  label?: string;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  isDefault?: boolean;
}

function normalizeAddress(payload: unknown): UserAddress {
  if (!isRecord(payload)) {
    return {
      id: 0,
      label: '',
      recipientName: '',
      recipientPhone: '',
      addressLine: '',
      isDefault: false,
    };
  }

  return {
    id: readNumber(payload.id),
    label: readString(payload.label),
    recipientName: readString(payload.recipientName),
    recipientPhone: readString(payload.recipientPhone),
    addressLine: readString(payload.addressLine),
    isDefault: readBoolean(payload.isDefault),
  };
}

export const addressApi = {
  getMyAddresses: async (): Promise<UserAddress[]> => {
    const response = await axiosClient.get<unknown, unknown>('/api/user/addresses');
    return unwrapCollection<unknown>(response, ['data', 'items', 'content']).map(normalizeAddress);
  },
  createAddress: async (data: UserAddressRequest): Promise<UserAddress> => {
    const response = await axiosClient.post<unknown, unknown>('/api/user/addresses', data);
    return normalizeAddress(response);
  },
  updateAddress: async (id: number, data: UserAddressRequest): Promise<UserAddress> => {
    const response = await axiosClient.put<unknown, unknown>(`/api/user/addresses/${id}`, data);
    return normalizeAddress(response);
  },
  setDefaultAddress: async (id: number): Promise<UserAddress> => {
    const response = await axiosClient.patch<unknown, unknown>(`/api/user/addresses/${id}/default`, {});
    return normalizeAddress(response);
  },
  deleteAddress: async (id: number): Promise<void> => {
    await axiosClient.delete(`/api/user/addresses/${id}`);
  },
};
