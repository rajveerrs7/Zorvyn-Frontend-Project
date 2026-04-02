export type TransactionType = "income" | "expense";
export type Role = "viewer" | "admin";
export type ThemeMode = "dark" | "light";

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: TransactionType;
  merchant: string;
  note?: string;
};
