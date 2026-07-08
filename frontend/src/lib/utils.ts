/**
 * lib/utils.ts
 * Standard Shadcn UI helper for conditional Tailwind class merging.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}