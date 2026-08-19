type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean>;

/**
 * Minimal class name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: two extra dependencies for what is
 * eight lines here, and the components below never emit conflicting utilities.
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];

  for (const value of values) {
    if (!value) continue;

    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      continue;
    }

    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
      continue;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) out.push(key);
    }
  }

  return out.join(' ');
}
