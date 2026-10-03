import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
interface WishlistState { ids: number[]; hasHydrated: boolean; hydrate: () => void; toggle: (id: number) => void }
export const useWishlistStore = create<WishlistState>()(persist((set) => ({
  ids: [], hasHydrated: false,
  hydrate: () => set({ hasHydrated: true }),
  toggle: (id) => set((state) => ({ ids: state.ids.includes(id) ? state.ids.filter((item) => item !== id) : [...state.ids, id].slice(-100) })),
}), { name: 'flash-store-wishlist', storage: createJSONStorage(() => localStorage), skipHydration: true, partialize: (state) => ({ ids: state.ids }), onRehydrateStorage: () => (state) => state?.hydrate() }));
