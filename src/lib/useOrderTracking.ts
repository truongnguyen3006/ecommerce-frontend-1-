'use client';
import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orderApi';
import { useAuthStore } from '@/store/useAuthStore';
import { freshAccessToken } from '@/lib/axiosClient';
import { httpStatus } from '@/lib/api-error';
import { isTerminalOrder } from '@/lib/order-status';

export function useOrderTracking(orderNumber: string, acceptedHere: boolean) {
  const { user, token } = useAuthStore();
  const queryClient = useQueryClient();
  const key = ['order', user?.keycloakId, orderNumber];
  const reads = useRef(0), startedAt = useRef(0);
  const [connected, setConnected] = useState(false);
  const valid = /^[A-Za-z0-9-]{1,64}$/.test(orderNumber);
  const query = useQuery({
    queryKey: key, enabled: valid, staleTime: 0, retry: false,
    queryFn: async () => { if (!startedAt.current) startedAt.current = Date.now(); reads.current++; return orderApi.getOrderById(orderNumber); },
    refetchInterval: (state) => {
      const status = httpStatus(state.state.error);
      if (reads.current >= 40 || Date.now() - startedAt.current > 300_000 || isTerminalOrder(state.state.data?.status) ||
        status === 401 || status === 403 || (status === 404 && !acceptedHere)) return false;
      return 8_000;
    },
    refetchIntervalInBackground: false,
  });
  const active = Boolean(query.data && !isTerminalOrder(query.data.status));
  useEffect(() => {
    if (!active || !token || !valid) return;
    let disposed = false, failures = 0;
    const client = new Client({
      webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws'),
      reconnectDelay: 5_000, connectionTimeout: 10_000,
      beforeConnect: async () => {
        const access = await freshAccessToken().catch(() => null);
        if (!access || disposed) { void client.deactivate(); return; }
        client.connectHeaders = { Authorization: `Bearer ${access}` };
      },
      onConnect: () => {
        if (disposed) return;
        setConnected(true);
        client.subscribe(`/topic/order/${orderNumber}`, () => {
          // Notifications prompt an authorized read; they never fabricate a completed order.
          void queryClient.invalidateQueries({ queryKey: ['order', user?.keycloakId, orderNumber], exact: true });
        });
        void queryClient.invalidateQueries({ queryKey: ['order', user?.keycloakId, orderNumber], exact: true });
      },
      onWebSocketClose: () => {
        if (disposed) return;
        setConnected(false);
        if (++failures >= 3) void client.deactivate();
      },
      onStompError: () => { if (!disposed) { setConnected(false); void client.deactivate(); } },
    });
    client.activate();
    return () => { disposed = true; void client.deactivate(); };
  }, [active, orderNumber, queryClient, token, user?.keycloakId, valid]);
  const refresh = () => { reads.current = 0; startedAt.current = Date.now(); void query.refetch(); };
  const paused = reads.current >= 40 || (startedAt.current > 0 && Date.now() - startedAt.current > 300_000);
  return { ...query, connected: active && connected, refresh, paused, valid };
}
