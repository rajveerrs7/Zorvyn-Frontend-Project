"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateTotals,
  categories,
  type Filters,
  type Transaction,
  type TransactionType,
  useFinanceStore,
} from "@/lib/finance-store";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  ArrowDownUp,
  ArrowUpRight,
  Download,
  Moon,
  PencilLine,
  Plus,
  RefreshCcw,
  Sun,
  UploadCloud,
} from "lucide-react";
import clsx from "clsx";

const panelMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const toDateInput = (value: string) => value;

const CHART_COLORS = [
  "#64FFDA",
  "#7C6CFF",
  "#38BDF8",
  "#F472B6",
  "#FACC15",
  "#FB7185",
  "#4ADE80",
];

export default function Home() {
  const {
    transactions,
    role,
    theme,
    filters,
    isSyncing,
    setRole,
    setTheme,
    setFilters,
    addTransaction,
    updateTransaction,
    syncFromMock,
    resetSample,
  } = useFinanceStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "month" | "category">(
    "none"
  );
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    date: "2026-03-29",
    amount: 150,
    category: "Dining",
    type: "expense",
    merchant: "Echo Bistro",
    note: "",
  });

  const totals = useMemo(() => calculateTotals(transactions), [transactions]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) =>
      startOfMonth(subMonths(now, 5 - index))
    );
    let runningBalance = 0;
    return months.map((month) => {
      const monthKey = format(month, "yyyy-MM");
      const monthTransactions = transactions.filter((item) =>
        item.date.startsWith(monthKey)
      );
      const income = monthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0);
      const expenses = monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0);
      runningBalance += income - expenses;
      return {
        month: format(month, "MMM"),
        income,
        expenses,
        balance: runningBalance,
      };
    });
  }, [transactions]);

  const spendingBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      });
    return Array.from(map.entries()).map(([category, total]) => ({
      name: category,
      value: total,
    }));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const search = filters.search.toLowerCase();
    return transactions
      .filter((item) =>
        filters.type === "all" ? true : item.type === filters.type
      )
      .filter((item) =>
        filters.categories.length === 0
          ? true
          : filters.categories.includes(item.category)
      )
      .filter((item) => {
        if (!filters.dateFrom && !filters.dateTo) return true;
        const time = new Date(item.date).getTime();
        const fromTime = filters.dateFrom
          ? new Date(filters.dateFrom).getTime()
          : -Infinity;
        const toTime = filters.dateTo
          ? new Date(filters.dateTo).getTime()
          : Infinity;
        return time >= fromTime && time <= toTime;
      })
      .filter((item) => {
        const min = filters.minAmount ? Number(filters.minAmount) : -Infinity;
        const max = filters.maxAmount ? Number(filters.maxAmount) : Infinity;
        return item.amount >= min && item.amount <= max;
      })
      .filter((item) => {
        if (!search) return true;
        return (
          item.merchant.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          item.note?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const direction = filters.sortDir === "asc" ? 1 : -1;
        if (filters.sortKey === "amount") {
          return (a.amount - b.amount) * direction;
        }
        return (
          (new Date(a.date).getTime() - new Date(b.date).getTime()) * direction
        );
      });
  }, [transactions, filters]);

  const insights = useMemo(() => {
    const spendTotals = [...spendingBreakdown].sort(
      (a, b) => b.value - a.value
    );
    const topCategory = spendTotals[0];
    const lastMonth = monthlyTrend[monthlyTrend.length - 1];
    const prevMonth = monthlyTrend[monthlyTrend.length - 2];
    const expenseDelta = prevMonth
      ? ((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100
      : 0;
    const savingsRate =
      totals.income === 0
        ? 0
        : ((totals.income - totals.expenses) / totals.income) * 100;
    return {
      topCategory: topCategory
        ? `${topCategory.name} (${currency(topCategory.value)})`
        : "No expenses yet",
      expenseDelta,
      savingsRate,
    };
  }, [spendingBreakdown, monthlyTrend, totals]);

  const groupedTransactions = useMemo(() => {
    if (groupBy === "none") {
      return [{ label: "All transactions", items: filteredTransactions }];
    }
    const groups = new Map<string, Transaction[]>();
    filteredTransactions.forEach((item) => {
      const label =
        groupBy === "month"
          ? format(parseISO(item.date), "MMM yyyy")
          : item.category;
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)?.push(item);
    });
    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredTransactions, groupBy]);

  const toggleCategory = (category: string) => {
    const exists = filters.categories.includes(category);
    setFilters({
      categories: exists
        ? filters.categories.filter((item) => item !== category)
        : [...filters.categories, category],
    });
  };

  const exportJSON = () => {
    const payload = JSON.stringify(filteredTransactions, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transactions.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ["Date", "Merchant", "Category", "Type", "Amount", "Note"];
    const rows = filteredTransactions.map((item) => [
      item.date,
      item.merchant,
      item.category,
      item.type,
      item.amount.toString(),
      item.note ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${value.replaceAll('"', '""').replaceAll("\n", " ")}"`
          )
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      date: transaction.date,
      amount: transaction.amount,
      category: transaction.category,
      type: transaction.type,
      merchant: transaction.merchant,
      note: transaction.note ?? "",
    });
  };

  const handleSubmit = () => {
    if (role !== "admin") return;
    if (editingId) {
      updateTransaction(editingId, form);
    } else {
      addTransaction(form);
    }
    setEditingId(null);
    setForm({
      date: "2026-03-29",
      amount: 150,
      category: "Dining",
      type: "expense",
      merchant: "Echo Bistro",
      note: "",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="grid-dots">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 lg:px-10">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-muted">
                Zorvyn Finance Suite
              </p>
              <h1 className="text-3xl font-semibold text-strong md:text-4xl lg:text-5xl">
                Finance dashboard for clear, confident decisions.
              </h1>
              <p className="max-w-2xl text-base text-muted md:text-lg">
                Track cash flow, understand spending patterns, and surface
                insights with a single glance. Switch roles to see the admin
                editing controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  setTheme(theme === "dark" ? "light" : "dark")
                }
                className="border-soft text-strong flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:border-white/30"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Light mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Dark mode
                  </>
                )}
              </button>
              <div className="glass-card flex items-center gap-3 rounded-full px-4 py-2">
                <span className="text-xs uppercase tracking-wide text-muted">
                  Role
                </span>
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as "viewer" | "admin")
                  }
                  className="text-strong rounded-full bg-transparent text-sm font-medium focus:outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                onClick={() => void syncFromMock()}
                className="border-soft text-strong flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:border-white/30"
                disabled={isSyncing}
              >
                <UploadCloud className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Sync mock API"}
              </button>
              <button
                onClick={resetSample}
                className="border-soft text-strong flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:border-white/30"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset sample data
              </button>
            </div>
          </header>

          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                label: "Total Balance",
                value: currency(totals.balance),
                helper: "Net position across all accounts",
              },
              {
                label: "Monthly Income",
                value: currency(totals.income),
                helper: "Recurring and one-time inflows",
              },
              {
                label: "Monthly Expenses",
                value: currency(totals.expenses),
                helper: "Operational + lifestyle outflows",
              },
            ].map((card) => (
              <motion.div
                key={card.label}
                {...panelMotion}
                className="glass-card highlight-ring flex flex-col gap-3 rounded-2xl p-6"
              >
                <p className="text-sm uppercase tracking-wide text-muted">
                  {card.label}
                </p>
                <p className="font-display text-3xl font-semibold text-strong">
                  {card.value}
                </p>
                <p className="text-sm text-muted">{card.helper}</p>
              </motion.div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.6fr_1fr]">
            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted">
                    Balance Trend
                  </p>
                  <h2 className="text-xl font-semibold text-strong">
                    Cash flow over time
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <ArrowUpRight className="h-4 w-4" />
                  {currency(monthlyTrend[monthlyTrend.length - 1]?.balance ?? 0)}
                </div>
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid rgba(148,163,184,0.2)",
                      }}
                      formatter={(value: number) => currency(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#64ffda"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#7c6cff"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted">
                    Spending Mix
                  </p>
                  <h2 className="text-xl font-semibold text-strong">
                    Category breakdown
                  </h2>
                </div>
                <p className="text-sm text-muted">
                  {spendingBreakdown.length} categories
                </p>
              </div>
              <div className="mt-6 flex h-64 items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingBreakdown}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {spendingBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      contentStyle={{
                        background: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid rgba(148,163,184,0.2)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted">
                {spendingBreakdown.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span>{currency(item.value)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted">
                    Transactions
                  </p>
                  <h2 className="text-xl font-semibold text-strong">
                    Explore your activity
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <input
                    value={filters.search}
                    onChange={(event) =>
                      setFilters({ search: event.target.value })
                    }
                    placeholder="Search merchant or note"
                    className="border-soft text-strong w-48 rounded-full border bg-transparent px-4 py-2 text-sm placeholder:text-slate-500 focus:border-white/30 focus:outline-none"
                  />
                  <select
                    value={filters.type}
                    onChange={(event) =>
                      setFilters({
                        type: event.target.value as Filters["type"],
                      })
                    }
                    className="border-soft text-strong rounded-full border bg-transparent px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
                  >
                    <option value="all">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <select
                    value={`${filters.sortKey}-${filters.sortDir}`}
                    onChange={(event) => {
                      const [sortKey, sortDir] = event.target.value.split("-");
                      setFilters({
                        sortKey: sortKey as Filters["sortKey"],
                        sortDir: sortDir as Filters["sortDir"],
                      });
                    }}
                    className="border-soft text-strong rounded-full border bg-transparent px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
                  >
                    <option value="date-desc">Newest first</option>
                    <option value="date-asc">Oldest first</option>
                    <option value="amount-desc">Highest amount</option>
                    <option value="amount-asc">Lowest amount</option>
                  </select>
                  <div className="border-soft text-strong flex items-center gap-2 rounded-full border px-3 py-2 text-xs">
                    <span className="text-muted">Group by</span>
                    <select
                      value={groupBy}
                      onChange={(event) =>
                        setGroupBy(
                          event.target.value as "none" | "month" | "category"
                        )
                      }
                      className="text-strong bg-transparent text-xs focus:outline-none"
                    >
                      <option value="none">None</option>
                      <option value="month">Month</option>
                      <option value="category">Category</option>
                    </select>
                  </div>
                  <button
                    onClick={exportCSV}
                    className="border-soft text-strong flex items-center gap-2 rounded-full border px-3 py-2 text-sm hover:border-white/30"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={exportJSON}
                    className="border-soft text-strong flex items-center gap-2 rounded-full border px-3 py-2 text-sm hover:border-white/30"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </button>
                </div>
              </div>

              <div className="border-soft text-muted mt-6 grid gap-3 rounded-2xl border p-4 text-sm lg:grid-cols-[1.2fr_1fr_1fr]">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Category filter
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const active = filters.categories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={clsx(
                            "rounded-full border px-3 py-1 text-xs transition",
                            active
                              ? "border-emerald-300/60 bg-emerald-300/10 text-emerald-200"
                              : "border-soft text-muted hover:border-white/30"
                          )}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Date range
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) =>
                        setFilters({ dateFrom: event.target.value })
                      }
                      className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 text-xs focus:border-white/30 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) =>
                        setFilters({ dateTo: event.target.value })
                      }
                      className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 text-xs focus:border-white/30 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Amount range
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      value={filters.minAmount}
                      onChange={(event) =>
                        setFilters({ minAmount: event.target.value })
                      }
                      placeholder="Min"
                      className="border-soft text-strong w-24 rounded-xl border bg-transparent px-3 py-2 text-xs placeholder:text-slate-500 focus:border-white/30 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={filters.maxAmount}
                      onChange={(event) =>
                        setFilters({ maxAmount: event.target.value })
                      }
                      placeholder="Max"
                      className="border-soft text-strong w-24 rounded-xl border bg-transparent px-3 py-2 text-xs placeholder:text-slate-500 focus:border-white/30 focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        setFilters({
                          categories: [],
                          dateFrom: "",
                          dateTo: "",
                          minAmount: "",
                          maxAmount: "",
                        })
                      }
                      className="border-soft text-strong flex items-center gap-2 rounded-full border px-3 py-2 text-xs hover:border-white/30"
                    >
                      <ArrowDownUp className="h-3 w-3" />
                      Reset filters
                    </button>
                  </div>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
                    <p className="text-lg text-strong">
                      No transactions match this view.
                    </p>
                    <p className="text-sm text-muted">
                      Adjust filters or reset the sample data to repopulate the
                      dashboard.
                    </p>
                  </div>
                ) : (
                <>
                  <div className="mt-6 md:hidden">
                    {groupedTransactions.map((group) => (
                      <div key={group.label} className="mb-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-strong">
                            {group.label}
                          </p>
                          <p className="text-xs text-muted">
                            {group.items.length} items
                          </p>
                        </div>
                        <div className="space-y-3">
                          {group.items.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="glass-card rounded-2xl p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-strong">
                                    {transaction.merchant}
                                  </p>
                                  <p className="text-xs text-muted">
                                    {format(
                                      parseISO(transaction.date),
                                      "MMM dd, yyyy"
                                    )}
                                  </p>
                                </div>
                                <p
                                  className={clsx(
                                    "text-sm font-semibold",
                                    transaction.type === "income"
                                      ? "text-emerald-300"
                                      : "text-rose-300"
                                  )}
                                >
                                  {transaction.type === "income" ? "+" : "-"}
                                  {currency(transaction.amount)}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                                <span>{transaction.category}</span>
                                <button
                                  onClick={() => handleEdit(transaction)}
                                  disabled={role !== "admin"}
                                  className={clsx(
                                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                                    role === "admin"
                                      ? "bg-white/10 text-strong hover:bg-white/20"
                                      : "cursor-not-allowed bg-white/5 text-muted"
                                  )}
                                >
                                  <PencilLine className="h-3 w-3" />
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-widest text-muted">
                      <tr>
                        <th className="py-3">Date</th>
                        <th className="py-3">Merchant</th>
                        <th className="py-3">Category</th>
                        <th className="py-3">Type</th>
                        <th className="py-3 text-right">Amount</th>
                        <th className="py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    {groupedTransactions.map((group) => (
                      <tbody
                        key={group.label}
                        className="divide-y divide-white/5 text-strong"
                      >
                        <tr className="bg-white/5">
                          <td
                            colSpan={6}
                            className="py-2 text-xs font-semibold uppercase tracking-widest text-muted"
                          >
                            {group.label} • {group.items.length} entries
                          </td>
                        </tr>
                        {group.items.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="hover:bg-white/5"
                          >
                            <td className="py-3">
                              {format(
                                parseISO(transaction.date),
                                "MMM dd, yyyy"
                              )}
                            </td>
                            <td className="py-3">{transaction.merchant}</td>
                            <td className="py-3">{transaction.category}</td>
                            <td className="py-3 capitalize">
                              {transaction.type}
                            </td>
                            <td
                              className={clsx(
                                "py-3 text-right font-medium",
                                transaction.type === "income"
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              )}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {currency(transaction.amount)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleEdit(transaction)}
                                disabled={role !== "admin"}
                                className={clsx(
                                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                                  role === "admin"
                                    ? "bg-white/10 text-strong hover:bg-white/20"
                                    : "cursor-not-allowed bg-white/5 text-muted"
                                )}
                              >
                                <PencilLine className="h-3 w-3" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                  </div>
                </>
              )}
            </motion.div>

            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted">
                    {role === "admin" ? "Admin tools" : "Viewer mode"}
                  </p>
                  <h2 className="text-xl font-semibold text-strong">
                    {role === "admin"
                      ? editingId
                        ? "Edit transaction"
                        : "Add a transaction"
                      : "Editing locked"}
                  </h2>
                </div>
                <Plus className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-5 grid gap-4 text-sm">
                <label className="text-muted flex flex-col gap-2">
                  Date
                  <input
                    type="date"
                    value={toDateInput(form.date)}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  />
                </label>
                <label className="text-muted flex flex-col gap-2">
                  Merchant
                  <input
                    value={form.merchant}
                    onChange={(event) =>
                      setForm({ ...form, merchant: event.target.value })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  />
                </label>
                <label className="text-muted flex flex-col gap-2">
                  Amount
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        amount: Number(event.target.value),
                      })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  />
                </label>
                <label className="text-muted flex flex-col gap-2">
                  Type
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as TransactionType,
                      })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>
                <label className="text-muted flex flex-col gap-2">
                  Category
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-muted flex flex-col gap-2">
                  Note
                  <input
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                    disabled={role !== "admin"}
                    className="border-soft text-strong rounded-xl border bg-transparent px-3 py-2 focus:border-white/30 focus:outline-none disabled:cursor-not-allowed"
                  />
                </label>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={role !== "admin"}
                    className={clsx(
                      "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                      role === "admin"
                        ? "bg-emerald-300 text-slate-900 hover:bg-emerald-200"
                        : "cursor-not-allowed bg-white/5 text-muted"
                    )}
                  >
                    {editingId ? "Save changes" : "Add transaction"}
                  </button>
                  {editingId && role === "admin" && (
                    <button
                      onClick={() => setEditingId(null)}
                      className="border-soft text-strong rounded-full border px-4 py-2 text-sm hover:border-white/40"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.4fr_1fr]">
            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted">
                    Insights
                  </p>
                  <h2 className="text-xl font-semibold text-strong">
                    Key observations
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="border-soft rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Highest spend
                  </p>
                  <p className="mt-2 text-base font-semibold text-strong">
                    {insights.topCategory}
                  </p>
                </div>
                <div className="border-soft rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Monthly change
                  </p>
                  <p className="mt-2 text-base font-semibold text-strong">
                    {Number.isFinite(insights.expenseDelta)
                      ? `${insights.expenseDelta.toFixed(1)}%`
                      : "No comparison"}
                  </p>
                  <p className="text-xs text-muted">
                    Expense delta vs previous month
                  </p>
                </div>
                <div className="border-soft rounded-2xl border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Savings rate
                  </p>
                  <p className="mt-2 text-base font-semibold text-strong">
                    {insights.savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted">
                    Net income as % of total income
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              {...panelMotion}
              className="glass-card rounded-2xl p-6"
            >
              <div>
                <p className="text-sm uppercase tracking-wide text-muted">
                  Cash Flow Pulse
                </p>
                <h2 className="text-xl font-semibold text-strong">
                  Inflow vs outflow
                </h2>
              </div>
              <div className="mt-6 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient
                        id="income"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#7C6CFF" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#7C6CFF" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient
                        id="expenses"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#F472B6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F472B6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      formatter={(value: number) => currency(value)}
                      contentStyle={{
                        background: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid rgba(148,163,184,0.2)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#7C6CFF"
                      fill="url(#income)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#F472B6"
                      fill="url(#expenses)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 text-sm text-muted">
                A quick comparison of month-by-month inflows and outflows.
              </p>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
