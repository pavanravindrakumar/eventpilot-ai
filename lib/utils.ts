/**
 * General utility helpers for EventPilot AI.
 */

/**
 * Generate a random ID (browser + Node compatible, no crypto dependency).
 */
export function nanoid(): string {
  return (
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 10)
  );
}

/**
 * Format a date string to a human-readable form.
 */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a compact date (e.g. "Jan 15, 2025").
 */
export function formatDateCompact(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get the display label for an event type.
 */
export function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    birthday: "Birthday Celebration",
    community: "Community Event",
    custom: "Custom Event",
  };
  return labels[type] ?? capitalize(type);
}

/**
 * Get a color class for a task priority.
 */
export function priorityColor(priority: string): string {
  const colors: Record<string, string> = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };
  return colors[priority] ?? "text-stone-600 bg-stone-50 border-stone-200";
}

/**
 * Get a color class for a booking status.
 */
export function bookingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    not_contacted: "text-stone-500 bg-stone-100",
    contacted: "text-blue-600 bg-blue-50",
    quote_received: "text-amber-600 bg-amber-50",
    booked: "text-emerald-600 bg-emerald-50",
    cancelled: "text-red-500 bg-red-50",
  };
  return colors[status] ?? "text-stone-500 bg-stone-100";
}

/**
 * Get a label for a booking status.
 */
export function bookingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_contacted: "Not Contacted",
    contacted: "Contacted",
    quote_received: "Quote Received",
    booked: "Booked",
    cancelled: "Cancelled",
  };
  return labels[status] ?? capitalize(status);
}

/**
 * Truncate a string to maxLength, appending "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

export { formatCurrency } from "./budget";

