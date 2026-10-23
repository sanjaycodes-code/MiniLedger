export function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDateString(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/**
 * Validates that `s` is formatted as YYYY-MM-DD, represents a real UTC calendar
 * date (rejecting rollovers such as 2026-02-31 by round-tripping through Date),
 * and is not earlier than 2000-01-01.
 */
export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return false;
  }
  if (s < '2000-01-01') {
    return false;
  }
  const parsed = parseDateString(s);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return toDateString(parsed) === s;
}
