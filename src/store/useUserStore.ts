import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserState = {
  id: string;
  email: string;
};

type StoreState = {
  user: UserState | null;
  setUser: (user: UserState | null) => void;
  clear: () => void;
};

export const useUserStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: "user-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

