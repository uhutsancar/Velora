import { describe, expect, it } from 'vitest';
import { en } from './locales/en';
import { tr } from './locales/tr';

/**
 * Locale parity.
 *
 * Turkish is the authoring language: a label is written there first and
 * translated afterwards. Nothing in the type system enforces that the two files
 * stay the same shape, so a key added on one side and forgotten on the other
 * ships as a raw key path rendered into the page — "content.helpTitle" where a
 * heading should be. These tests are the check that catches it.
 */

type Tree = Record<string, unknown>;

/** Flattens to dotted paths so a diff names the missing key, not its parent. */
function paths(source: Tree, prefix = ''): string[] {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof value === 'object' && value !== null
      ? paths(value as Tree, path)
      : [path];
  });
}

/** Interpolation placeholders, e.g. {{count}}, in authoring order. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((match) => match[1] ?? '').sort();
}

function valueAt(source: Tree, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (cursor, segment) => (cursor as Tree | undefined)?.[segment],
    source,
  );
}

const trPaths = paths(tr);
const enPaths = paths(en);

describe('translation bundles', () => {
  it('has no Turkish key missing from English', () => {
    expect(trPaths.filter((path) => !enPaths.includes(path))).toEqual([]);
  });

  it('has no English key missing from Turkish', () => {
    expect(enPaths.filter((path) => !trPaths.includes(path))).toEqual([]);
  });

  it('has no empty strings', () => {
    const blank = [...trPaths, ...enPaths].filter((path) => {
      const value = valueAt(tr, path) ?? valueAt(en, path);
      return typeof value === 'string' && value.trim().length === 0;
    });

    expect(blank).toEqual([]);
  });

  it('uses the same interpolation variables on both sides', () => {
    // A translation that drops {{count}} renders a sentence missing its number,
    // and one that invents a variable renders the braces verbatim.
    const mismatched = trPaths
      .filter((path) => enPaths.includes(path))
      .filter((path) => {
        const turkish = valueAt(tr, path);
        const english = valueAt(en, path);

        if (typeof turkish !== 'string' || typeof english !== 'string') return false;

        return placeholders(turkish).join(',') !== placeholders(english).join(',');
      });

    expect(mismatched).toEqual([]);
  });
});
