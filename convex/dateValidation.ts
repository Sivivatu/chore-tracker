const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateKey(dateKey: string) {
  if (!DATE_KEY_PATTERN.test(dateKey)) throw new Error("Invalid date");

  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("Invalid date");
  }
  return date;
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function validateHouseholdDateBounds(args: {
  date: string;
  householdCreatedAt: string;
  today?: string;
}) {
  parseDateKey(args.date);
  const minDate = args.householdCreatedAt.slice(0, 10);
  const maxDate = args.today ?? toDateKey(new Date());

  if (args.date < minDate) throw new Error("Date cannot be before household creation");
  if (args.date > maxDate) throw new Error("Date cannot be in the future");

  return { minDate, maxDate };
}

export function dayLabelFromDateKey(date: string) {
  const parsed = parseDateKey(date);
  const label = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][parsed.getUTCDay()];
  if (!label) throw new Error("Invalid date");
  return label;
}
