import type { HolidayPause } from "@/types/domain";

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWithinPause(dateKey: string, pauses: HolidayPause[]): boolean {
  return pauses.some((pause) => dateKey >= pause.startDate && dateKey <= pause.endDate);
}

export function getRecentDateKeys(today = new Date(), days = 7): string[] {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return toDateKey(date);
  });
}
