import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
interface CheckoutAttempt {
  fingerprint: string; idempotencyKey: string; orderNumber?: string;
  items: { skuCode: string; quantity: number; revision?: string }[];
}
interface CheckoutState {
  attempts: Record<string, CheckoutAttempt>;
  begin: (userId: string, fingerprint: string, items: CheckoutAttempt['items']) => string;
  accepted: (userId: string, orderNumber: string) => void;
  finish: (userId: string) => void;
}
export const useCheckoutStore = create<CheckoutState>()(persist((set, get) => ({
  attempts: {},
  begin: (userId, fingerprint, items) => {
    const previous = get().attempts[userId];
    if (previous?.fingerprint === fingerprint) return previous.idempotencyKey;
    const idempotencyKey = crypto.randomUUID();
    set({ attempts: { ...get().attempts, [userId]: { fingerprint, idempotencyKey, items } } });
    return idempotencyKey;
  },
  accepted: (userId, orderNumber) => set((state) => ({ attempts: { ...state.attempts, [userId]: { ...state.attempts[userId], orderNumber } } })),
  finish: (userId) => set((state) => {
    const attempts = { ...state.attempts }; delete attempts[userId]; return { attempts };
  }),
}), { name: 'flash-store-checkout', storage: createJSONStorage(() => sessionStorage), skipHydration: true }));
