import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
