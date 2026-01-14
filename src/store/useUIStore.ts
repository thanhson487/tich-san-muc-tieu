import { create } from 'zustand';

interface UIState {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => {
  const initial =
    typeof window !== 'undefined'
      ? localStorage.getItem('isDark') === 'true'
      : false;
  return {
    isDark: initial,
    setIsDark: (v: boolean) => {
      set({ isDark: v });
      if (typeof window !== 'undefined') {
        localStorage.setItem('isDark', String(v));
      }
    },
  };
});
