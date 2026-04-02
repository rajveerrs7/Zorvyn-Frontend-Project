import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mockTransactions } from "@/mocks/data";
import type {
  Role,
  ThemeMode,
  Transaction,
  TransactionType,
} from "@/lib/finance-types";

export type { Role, ThemeMode, Transaction, TransactionType };

export type Filters = {
  search: string;
  type: "all" | TransactionType;
  categories: string[];
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  sortKey: "date" | "amount";
  sortDir: "asc" | "desc";
};

export const categories = [
  "Housing",
  "Subscriptions",
  "Groceries",
  "Dining",
  "Travel",
  "Wellness",
  "Utilities",
  "Education",
  "Salary",
  "Investments",
];

const defaultFilters: Filters = {
  search: "",
  type: "all",
  categories: [],
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
  sortKey: "date",
  sortDir: "desc",
};

type FinanceState = {
  transactions: Transaction[];
  role: Role;
  theme: ThemeMode;
  filters: Filters;
  isSyncing: boolean;
  setRole: (role: Role) => void;
  setTheme: (theme: ThemeMode) => void;
  setFilters: (filters: Partial<Filters>) => void;
  addTransaction: (payload: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, payload: Omit<Transaction, "id">) => void;
  syncFromMock: () => Promise<void>;
  resetSample: () => void;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: mockTransactions,
      role: "viewer",
      theme: "dark",
      filters: defaultFilters,
      isSyncing: false,
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      addTransaction: (payload) =>
        set((state) => ({
          transactions: [
            { ...payload, id: createId() },
            ...state.transactions,
          ],
        })),
      updateTransaction: (id, payload) =>
        set((state) => ({
          transactions: state.transactions.map((item) =>
            item.id === id ? { ...payload, id } : item
          ),
        })),
      syncFromMock: async () => {
        set({ isSyncing: true });
        try {
          const response = await fetch("/api/transactions");
          if (!response.ok) throw new Error("Failed to sync");
          const data = (await response.json()) as {
            transactions: Transaction[];
          };
          set({ transactions: data.transactions, isSyncing: false });
        } catch (error) {
          set({ transactions: mockTransactions, isSyncing: false });
        }
      },
      resetSample: () =>
        set({ transactions: mockTransactions, filters: defaultFilters }),
    }),
    {
      name: "zorvyn-finance-store",
    }
  )
);

export const calculateTotals = (transactions: Transaction[]) => {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    income,
    expenses,
    balance: income - expenses,
  };
};
