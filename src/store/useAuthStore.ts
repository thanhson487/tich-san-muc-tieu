import { create } from 'zustand';
import users from '@/data/user.json';

interface AuthState {
  isAuthed: boolean;
  userId: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initial =
    typeof window !== 'undefined'
      ? localStorage.getItem('isAuthed') === 'true'
      : false;
  const initialUser =
    typeof window !== 'undefined' ? localStorage.getItem('userId') || null : null;
  return {
    isAuthed: initial,
    userId: initialUser,
    login: (username: string, password: string) => {
      const ok = Array.isArray(users)
        ? users.some((u: any) => String(u?.username) === username && String(u?.password) === password)
        : false;
      if (ok && typeof window !== 'undefined') {
        localStorage.setItem('isAuthed', 'true');
        localStorage.setItem('userId', username);
        set({ isAuthed: true, userId: username });
      }
      return ok;
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isAuthed');
        localStorage.removeItem('userId');
        try {
          const listRaw = localStorage.getItem('tradeProfilesList');
          const list = listRaw ? JSON.parse(listRaw) : [];
          if (Array.isArray(list)) {
            list.forEach((p: any) => {
              const id = String(p?.id || '');
              if (id) localStorage.removeItem(`tradeToolState:${id}`);
            });
          }
        } catch {}
        localStorage.removeItem('tradeProfilesList');
        localStorage.removeItem('tradeActiveProfileId');
      }
      set({ isAuthed: false, userId: null });
    },
  };
});
