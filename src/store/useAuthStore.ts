import { create } from 'zustand';

interface AuthState {
  isAuthed: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const USER = process.env.NEXT_PUBLIC_APP_LOGIN_USER || 'sonpham123';
const PASS = process.env.NEXT_PUBLIC_APP_LOGIN_PASS || 'sonpham123';

export const useAuthStore = create<AuthState>((set) => {
  const initial =
    typeof window !== 'undefined'
      ? localStorage.getItem('isAuthed') === 'true'
      : false;
  return {
    isAuthed: initial,
    login: (username: string, password: string) => {
      const ok = username === USER && password === PASS;
      if (ok && typeof window !== 'undefined') {
        localStorage.setItem('isAuthed', 'true');
        set({ isAuthed: true });
      }
      return ok;
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isAuthed');
      }
      set({ isAuthed: false });
    },
  };
});
