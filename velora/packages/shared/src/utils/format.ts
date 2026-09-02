const DEFAULT_LOCALE = 'tr-TR';
const DEFAULT_CURRENCY = 'TRY';

/** Intl formatters are expensive to build, so they are memoised per locale/currency. */
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatCurrency(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;
  const key = `${locale}:${currency}`;

  let formatter = currencyFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(key, formatter);
  }

  return formatter.format(amount);
}

/** Compact form for dashboard tiles: 12.4B, 1,2 Mn. */
export function formatCompactCurrency(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  currency: string = DEFAULT_CURRENCY,
): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined, locale: string = DEFAULT_LOCALE): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;

  let formatter = numberFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    numberFormatters.set(locale, formatter);
  }

  return formatter.format(amount);
}

export function formatPercent(value: number | null | undefined, locale: string = DEFAULT_LOCALE): string {
  const amount = Number.isFinite(value) ? (value as number) : 0;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(amount / 100);
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  if (!value) return '-';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const key = `${locale}:${JSON.stringify(options)}`;

  let formatter = dateFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }

  return formatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
  return formatDate(value, locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "3 gün önce" style relative time used in activity feeds. */
export function formatRelativeTime(value: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!value) return '-';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '-';

  const diffMs = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return formatter.format(Math.round(diffMs / 1000), 'second');
}

export function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '****';

  return `**** **** **** ${digits.slice(-4)}`;
}
