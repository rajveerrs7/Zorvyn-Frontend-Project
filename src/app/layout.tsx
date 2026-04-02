import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import MswProvider from "@/components/MswProvider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <MswProvider />
        {children}
      </body>
    </html>
  );
}
