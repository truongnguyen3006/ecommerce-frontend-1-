'use client';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useAuthStore } from '@/store/useAuthStore';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { retryRead } from '@/lib/api-error';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: retryRead }, mutations: { retry: false } },
  }));
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.user?.keycloakId !== previous.user?.keycloakId || state.isAuthenticated !== previous.isAuthenticated) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
  }), [queryClient]);
  useEffect(() => {
    let mounted = true;
    // The first client render must match SSR. Restore browser state afterward.
    void (async () => {
      try {
        await useCheckoutStore.persist?.rehydrate();
        await useWishlistStore.persist?.rehydrate();
        await useAuthStore.persist?.rehydrate();
      } finally {
        if (mounted) {
          useAuthStore.getState().setHasHydrated(true);
          useWishlistStore.getState().hydrate();
        }
      }
    })();
    return () => { mounted = false; };
  }, []);
  return <QueryClientProvider client={queryClient}><AntdRegistry><ConfigProvider locale={viVN} theme={{
    token: {
      colorPrimary: '#111111', colorInfo: '#111111', colorSuccess: '#111111', colorWarning: '#111111', colorError: '#111111',
      colorText: '#111111', colorTextSecondary: '#707072', colorTextDisabled: '#707072',
      colorBorder: '#e5e5e5', colorBgLayout: '#ffffff', colorBgContainer: '#ffffff',
      borderRadius: 0, borderRadiusLG: 0, fontWeightStrong: 500,
      boxShadow: 'none', boxShadowSecondary: 'none', boxShadowTertiary: 'none',
      fontFamily: 'Inter, Helvetica Neue, Helvetica, Arial, sans-serif', controlHeight: 44,
    },
    components: {
      Button: { borderRadius: 30, borderRadiusLG: 30, primaryShadow: 'none', dangerShadow: 'none', defaultShadow: 'none' },
      Menu: { itemBorderRadius: 0, itemSelectedBg: '#f5f5f5', itemSelectedColor: '#111111', itemHoverColor: '#111111' },
      Input: { activeShadow: 'none', borderRadius: 0 }, InputNumber: { activeShadow: 'none' },
      Table: { headerBg: '#f5f5f5', borderColor: '#e5e5e5' },
      Modal: { borderRadiusLG: 0 }, Card: { borderRadiusLG: 0 },
    },
  }}><AntdApp>{children}</AntdApp></ConfigProvider></AntdRegistry></QueryClientProvider>;
}
