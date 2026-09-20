/**
 * Editorial content model.
 *
 * Legal, help and brand-story copy lives here rather than in the shared i18n
 * bundle: those files carry interface labels that both apps load on every
 * session, and a privacy policy has no business being in that payload. Content
 * modules are imported only by the routes that render them, so they stay out of
 * the entry chunk entirely.
 */
import type { SupportedLanguage } from '@velora/shared';

export interface ContentSection {
  heading?: string;
  /** Paragraphs, rendered in order. */
  body?: string[];
  /** Bulleted list rendered after the paragraphs. */
  list?: string[];
  /** Small print set apart from the body. */
  note?: string;
  table?: { head: string[]; rows: string[][] };
}

export interface ContentDoc {
  title: string;
  subtitle?: string;
  /** ISO date shown as "last updated" on legal documents. */
  updatedAt?: string;
  sections: ContentSection[];
}

export interface FaqEntry {
  question: string;
  answer: string;
  /** Groups the question under a heading in the FAQ page. */
  group: string;
}

/** A record keyed by language, so a page picks its copy with one lookup. */
export type Localised<T> = Record<SupportedLanguage, T>;

/** Picks the copy for the active language, falling back to Turkish. */
export function pick<T>(source: Localised<T>, language: string): T {
  return source[language as SupportedLanguage] ?? source.tr;
}
