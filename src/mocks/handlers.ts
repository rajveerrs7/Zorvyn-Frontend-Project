import { http, HttpResponse } from "msw";
import { mockTransactions } from "./data";

export const handlers = [
  http.get("/api/transactions", () =>
    HttpResponse.json({
      transactions: mockTransactions,
      syncedAt: new Date().toISOString(),
    })
  ),
];
