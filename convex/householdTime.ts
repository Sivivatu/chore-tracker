const defaultHouseholdTimeZone = "Europe/London";

export { defaultHouseholdTimeZone };

export function assertIanaTimeZone(timeZone: string) {
  const trimmed = timeZone.trim();
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: trimmed });
  } catch {
    throw new Error("Choose a valid timezone");
  }
  return trimmed;
}

export function householdDateKey(timeZone: string | undefined, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? defaultHouseholdTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!year || !month || !day) throw new Error("Could not determine household date");
  return `${year}-${month}-${day}`;
}
