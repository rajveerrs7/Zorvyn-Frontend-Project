import type { Metadata } from "next";
import "./globals.css";
import MswProvider from "@/components/MswProvider";

export const metadata: Metadata = {
  title: "Zorvyn Finance Dashboard",
  description:
    "Interactive finance dashboard with summaries, trends, transactions, and insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">
        <MswProvider />
        {children}
      </body>
    </html>
  );
}
