import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ChartColorProvider } from "@/contexts/chart-color-context";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "sonner";
import { GlobalErrorHandler } from "@/components/global-error-handler";
import * as Sentry from "@sentry/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  return {
    title: "Expenses Tracker - Smart Personal Finance Management",
    description: "Track your spending, set budgets, and gain insights into your financial health with our modern expense tracking app.",
    keywords: ["expense tracker", "budgeting", "personal finance", "money management", "Australia"],
    other: {
      ...Sentry.getTraceData(),
      // Prevent Google Translate and other extensions from interfering
      "google": "notranslate",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="google" content="notranslate" />
          <meta name="translate" content="no" />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <ChartColorProvider>
              <GlobalErrorHandler />
              {children}
              <Toaster />
            </ChartColorProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
