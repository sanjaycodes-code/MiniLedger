const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function toDateString(d: Date): string {
  const year = String(d.getFullYear()).padStart(4, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  result.setDate(result.getDate() + n);
  return result;
}

export function formatDueDate(dateStr: string): string {
  const ymd = dateStr.slice(0, 10);
  const parts = ymd.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }
  const year = parts[0] ?? '';
  const monthIndex = Number(parts[1]) - 1;
  const day = (parts[2] ?? '').padStart(2, '0');
  const monthName = MONTHS[monthIndex] ?? '';
  return `${day} ${monthName} ${year}`;
}

export function daysFromToday(dateStr: string): number {
  const ymd = dateStr.slice(0, 10);
  const parts = ymd.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const now = new Date();
  const todayMidnight = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const targetMidnight = Date.UTC(year, month - 1, day);
  const diffMs = targetMidnight - todayMidnight;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}
