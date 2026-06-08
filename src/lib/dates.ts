import type { HolidayPause } from "@/types/domain";

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatBritishDateLabel(dateKey: string, referenceDateKey?: string): string {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) {
    return dateKey;
  }

  const includeYear = Boolean(referenceDateKey && year !== referenceDateKey.slice(0, 4));
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
  const dayMonth = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
  const label = `${weekday} ${dayMonth}`;

  return includeYear ? `${label} ${year}` : label;
}

export function formatBritishDateTime(value: string | Date, referenceDate = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  const referenceYear = referenceDate.getUTCFullYear();
  const year = date.getUTCFullYear();

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const shortYear = String(year).slice(2);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const datePart = year === referenceYear ? `${day}-${month}` : `${day}-${month}-${shortYear}`;
  return `${datePart} ${hours}:${minutes}`;
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
