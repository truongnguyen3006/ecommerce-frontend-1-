'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { cartApi } from '@/services/cartApi';
import { addressApi } from '@/services/addressApi';
export function useCart() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  return useQuery({ queryKey: ['cart', user?.keycloakId], queryFn: cartApi.getMine, enabled: hasHydrated && isAuthenticated });
}
export function useAddresses() {
  const { user, isAuthenticated } = useAuthStore();
  return useQuery({ queryKey: ['addresses', user?.keycloakId], queryFn: addressApi.getMyAddresses, enabled: isAuthenticated });
}
