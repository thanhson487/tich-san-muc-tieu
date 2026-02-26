import { create } from 'zustand';

interface UIState {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  const initial = true
  return {
    isDark: initial,
    setIsDark: (v: boolean) => {
      set({ isDark: true });
      if (typeof window !== 'undefined') {
        localStorage.setItem('isDark', String(v));
      }
    },
  };
});
