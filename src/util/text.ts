/**
 * Parsers for the human-readable labels LinkedIn renders ("31K followers",
 * "3h 43m", "Jan 9, 2025", "Software Development • San Francisco").
 */

/** Splits a label on its first `•`: `"Course • 3h 43m"` -> `Course` / `3h 43m`. */
export function splitOnBullet(text: string | null | undefined): {
  head: string | null;
  tail: string | null;
} {
  if (text == null) return { head: null, tail: null };
  const [head, ...rest] = text.split('•');
  return {
    head: head?.trim() || null,
    tail: rest.join('•').trim() || null,
  };
}

const COUNT_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

/** `"3M members"` -> 3000000, `"629K followers"` -> 629000, `"1,234"` -> 1234. */
export function parseAbbreviatedCount(
  label: string | null | undefined,
): number | null {
  const match = label?.match(/([\d,.]+)\s*([KMB])?/i);
  if (match == null) return null;
  const base = Number(match.at(1)?.replace(/,/g, ''));
  if (Number.isNaN(base)) return null;
  const multiplier = COUNT_MULTIPLIERS[match.at(2)?.toLowerCase() ?? ''] ?? 1;
  return Math.round(base * multiplier);
}

/** The first whole number in a label: `"4,525 students and alumni"` -> 4525. */
export function parseLeadingCount(
  label: string | null | undefined,
): number | null {
  const digits = label
    ?.match(/[\d,]+/)
    ?.at(0)
    ?.replace(/,/g, '');
  if (digits == null) return null;
  const count = Number(digits);
  return Number.isNaN(count) ? null : count;
}

/** `"3h 43m"` -> 223, `"47m"` -> 47. */
export function parseDurationMinutes(
  label: string | null | undefined,
): number | null {
  if (label == null) return null;
  const hours = Number(label.match(/(\d+)\s*h/)?.at(1) ?? 0);
  const minutes = Number(label.match(/(\d+)\s*m/)?.at(1) ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** `"Jan 9, 2025"` -> `{ year: 2025, month: 1, day: 9 }`. */
export function parseMonthDayYear(label: string | null | undefined): {
  year: number | null;
  month: number | null;
  day: number | null;
} {
  const match = label?.match(/([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4})/);
  if (match == null) return { year: null, month: null, day: null };
  return {
    year: Number(match.at(3)),
    month: MONTHS[match.at(1)?.slice(0, 3).toLowerCase() ?? ''] ?? null,
    day: Number(match.at(2)),
  };
}

/** A LinkedIn date object, where any part may be missing. */
export type PartialDate = {
  year?: number | null;
  month?: number | null;
  day?: number | null;
};

/**
 * Formats a LinkedIn date as `YYYY-MM-DD`. A missing month or day is filled
 * with the start or the end of the period, depending on `position`.
 */
export function formatPartialDate(
  date: PartialDate | null | undefined,
  position: 'start' | 'end',
): string | null {
  if (date?.year == null) return null;
  const month = date.month ?? (position === 'start' ? 1 : 12);
  const lastDayOfMonth = new Date(date.year, month, 0).getDate();
  const day = date.day ?? (position === 'start' ? 1 : lastDayOfMonth);
  return `${date.year}-${pad(month)}-${pad(day)}`;
}

/** Zero-pads a month or a day to two digits. */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Epoch milliseconds to an ISO-8601 string. */
export function epochToIso(epochMs: number | null | undefined): string | null {
  return epochMs == null ? null : new Date(epochMs).toISOString();
}
