import { create } from 'zustand';
import dayjs from 'dayjs';
import { fbGetAllTransactions, fbAddTransaction, fbUpdateTransaction, fbDeleteTransaction, fbOnTransactionsSnapshot } from '@/utils/firebaseDb';

interface Transaction {
  id?: number | string;
  date: string;
  amount: number;
  createdAt: number;
}

interface SavingsState {
  transactions: Transaction[];
  isLoading: boolean;
  selectedDate: string;
  fetchTransactions: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  addTransaction: (amount: number, date?: string) => Promise<void>;
  updateTransaction: (id: number | string, updates: { amount?: number; date?: string }) => Promise<void>;
  deleteTransaction: (id: number | string) => Promise<void>;
}

export const useSavingsStore = create<SavingsState>((set, get) => ({
  transactions: [],
  isLoading: false,
  selectedDate: dayjs().format('YYYY-MM-DD'),
  // internal subscription holder
  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const data: Transaction[] = await fbGetAllTransactions();
      // Sort by date descending, then createdAt descending
      const sortedData = data.sort((a, b) => {
          if (a.date !== b.date) {
              return b.date.localeCompare(a.date);
          }
          return b.createdAt - a.createdAt;
      });
      set({ transactions: sortedData, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch transactions', error);
      set({ isLoading: false });
    }
  },
  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },
  addTransaction: async (amount: number, date?: string) => {
    set({ isLoading: true });
    try {
      const useDate = date || get().selectedDate;
      await fbAddTransaction(amount, useDate);
      await get().fetchTransactions();
      set({ isLoading: false });
      return;
    } catch (error) {
      console.error('Failed to add transaction', error);
      set({ isLoading: false });
      throw error;
    }
  },
  updateTransaction: async (id: number | string, updates: { amount?: number; date?: string }) => {
    set({ isLoading: true });
    try {
      await fbUpdateTransaction(id as string, updates);
      await get().fetchTransactions();
      set({ isLoading: false });
      return;
    } catch (error) {
      console.error('Failed to update transaction', error);
      set({ isLoading: false });
      throw error;
    }
  },
  deleteTransaction: async (id: number | string) => {
    set({ isLoading: true });
    try {
      await fbDeleteTransaction(id as string);
      await get().fetchTransactions();
      set({ isLoading: false });
      return;
    } catch (error) {
      console.error('Failed to delete transaction', error);
      set({ isLoading: false });
      throw error;
    }
  },
})) ;
