export function formatIndianDigits(n: number): string {
  const str = String(Math.floor(Math.abs(n)));
  if (str.length <= 3) {
    return str;
  }
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${groupedRest},${lastThree}`;
}

export function formatMinor(amountMinor: number): string {
  const isNegative = amountMinor < 0;
  const absMinor = Math.round(Math.abs(amountMinor));
  const rupees = Math.floor(absMinor / 100);
  const paise = absMinor % 100;
  const formattedRupees = formatIndianDigits(rupees);
  const prefix = isNegative ? '-₹' : '₹';

  if (paise === 0) {
    return `${prefix}${formattedRupees}`;
  }

  const paddedPaise = String(paise).padStart(2, '0');
  return `${prefix}${formattedRupees}.${paddedPaise}`;
}

/**
 * Parses a rupee string (e.g. "2500", "2,500", "2500.5", "2500.50") into
 * integer paise (1..1_000_000_000) using string/integer math only.
 */
export function parseRupeesToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const parts = cleaned.split('.');
  const rupeesStr = parts[0] ?? '0';
  const paiseStr = (parts[1] ?? '').padEnd(2, '0');

  if (rupeesStr.length > 9) {
    return null;
  }

  const rupees = Number(rupeesStr);
  const paise = Number(paiseStr);
  const totalMinor = rupees * 100 + paise;

  if (
    !Number.isSafeInteger(totalMinor) ||
    totalMinor < 1 ||
    totalMinor > 1_000_000_000
  ) {
    return null;
  }

  return totalMinor;
}
