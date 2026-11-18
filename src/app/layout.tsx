
import type { Metadata } from "next";
import "./globals.css";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthSessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Equora – Group Expense Manager",
  description:
    "Production-quality, responsive Group Expense Management Application for roommates, trips, and shared finances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        <AuthSessionProvider>
          <QueryProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
