import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts integer paise to formatted INR string (e.g. 100050 -> "₹1,000.50")
 */
export function formatPaiseToINR(paise: number, showSign: boolean = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const formatted = rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (isNegative) {
    return `-₹${formatted}`;
  }
  if (showSign && paise > 0) {
    return `+₹${formatted}`;
  }
  return `₹${formatted}`;
}

/**
 * Converts Rupees (e.g. 1000.50 or "1000.50") into exact integer paise (100050)
 * Uses Math.round to eliminate floating-point imprecision.
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer paise to decimal rupees (e.g. 100050 -> 1000.50)
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats a Date object or string into readable Indian format (e.g. "14 Nov 2026")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generates user initials for avatar
 */
export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
