import { ArrowUpRight, LifeBuoy, PackageCheck, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildBreadcrumbJsonLd, buildFaqJsonLd, formatDate, localeFor } from '@velora/shared';
import { Reveal } from '@/components/motion/Reveal';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Disclosure, DisclosureGroup } from '@/components/ui/Disclosure';
import { Seo } from '@/components/seo/Seo';
import { env } from '@/config/env';
import { HELP_DOCS, faqEntries, type HelpSlug } from '@/content/help';
import { LEGAL_DOCS, type LegalSlug } from '@/content/legal';
import { pick, type ContentDoc, type ContentSection } from '@/content/types';

/* -------------------------------------------------------------------------- */
/* Shared renderer                                                            */
/* -------------------------------------------------------------------------- */

/** Anchor id for a section heading, used by the sticky "on this page" rail. */
const sectionId = (heading: string, index: number) =>
  `${heading
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')}-${index}`;

function SectionBody({ section }: { section: ContentSection }) {
  return (
    <>
      {section.body?.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className="mt-4 text-sm leading-relaxed text-ink-600 text-pretty">
          {paragraph}
        </p>
      ))}

      {section.list && (
        <ul className="mt-5 space-y-2.5">
          {section.list.map((entry) => (
            <li key={entry.slice(0, 32)} className="flex gap-3 text-sm leading-relaxed text-ink-600">
              <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-tan-500" />
              <span className="text-pretty">{entry}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        // Reference tables carry three columns of prose; they scroll rather than
        // wrap so the page body never gains a horizontal scrollbar of its own.
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200">
                {section.table.head.map((cell) => (
                  <th key={cell} scope="col" className="label-caps py-3 pr-6 text-ink-500">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join('|')} className="border-b border-ink-100">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className={cellIndex === 0 ? 'py-3 pr-6 font-medium text-ink-900' : 'py-3 pr-6 text-ink-600'}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.note && (
        <p className="mt-5 border-l-2 border-tan-400 bg-sand-100 px-4 py-3 text-xs leading-relaxed text-ink-600">
          {section.note}
        </p>
      )}
    </>
  );
}

interface DocPageProps {
  doc: ContentDoc;
  path: string;
  crumbs: Array<{ name: string; href?: string }>;
  /** Rendered under the article, e.g. the "still stuck" contact block. */
  footer?: React.ReactNode;
}

/**
 * Two-column reference layout: a sticky contents rail on the left, the document
 * on the right. Below `lg` the rail is dropped rather than stacked — a list of
 * links immediately above the same headings is noise on a phone.
 */
function DocPage({ doc, path, crumbs, footer }: DocPageProps) {
  const { t, i18n } = useTranslation();
  const locale = localeFor(i18n.language);

  const sections = doc.sections.map((section, index) => ({
    section,
    id: section.heading ? sectionId(section.heading, index) : undefined,
  }));

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo
        title={doc.title}
        description={doc.subtitle ?? doc.title}
        path={path}
        type="article"
        jsonLd={[
          buildBreadcrumbJsonLd(
            crumbs.filter((crumb) => crumb.href).map((crumb) => ({ name: crumb.name, url: crumb.href ?? '/' })),
            env.siteUrl,
          ),
        ]}
      />

      <Breadcrumbs items={crumbs} />

      <div className="mt-8 grid gap-12 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="label-caps mb-4 text-ink-400">{t('content.onThisPage')}</p>

            <ul className="space-y-2.5 border-l border-ink-100">
              {sections.map(({ section, id }) =>
                section.heading && id ? (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="-ml-px block border-l border-transparent pl-4 text-sm text-ink-500 transition-colors hover:border-tan-500 hover:text-ink-900"
                    >
                      {section.heading}
                    </a>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </aside>

        <article className="max-w-2xl">
          <header className="border-b border-ink-100 pb-8">
            <h1 className="text-headline text-balance">{doc.title}</h1>

            {doc.subtitle && <p className="mt-4 text-base leading-relaxed text-ink-500 text-pretty">{doc.subtitle}</p>}

            {doc.updatedAt && (
              <p className="mt-6 text-2xs uppercase tracking-label text-ink-400">
                {t('content.updatedAt', { date: formatDate(doc.updatedAt, locale) })}
              </p>
            )}
          </header>

          {sections.map(({ section, id }, index) => (
            <section key={id ?? index} id={id} className="scroll-mt-28 border-b border-ink-100 py-8 last:border-b-0">
              {section.heading && <h2 className="font-display text-title text-ink-900">{section.heading}</h2>}
              <SectionBody section={section} />
            </section>
          ))}

          {footer}
        </article>
      </div>
    </div>
  );
}

/** Contact prompt closing the help documents. */
function StillStuck() {
  const { t } = useTranslation();

  return (
    <div className="mt-10 flex flex-col gap-4 bg-ink-900 p-8 text-sand-50 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-xl text-sand-50">{t('content.stillStuck')}</h2>
        <p className="mt-1.5 text-sm text-sand-100/70">{t('content.stillStuckBody')}</p>
      </div>

      <Button
        to="/iletisim"
        variant="outline"
        className="shrink-0 border-sand-50 text-sand-50 hover:bg-sand-50 hover:text-ink-900"
      >
        {t('content.contactUs')}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Routed pages                                                               */
/* -------------------------------------------------------------------------- */

const LEGAL_LABEL_KEYS: Record<LegalSlug, string> = {
  gizlilik: 'footer.privacy',
  kosullar: 'footer.terms',
  kvkk: 'footer.kvkk',
  cerez: 'footer.cookies',
};

/**
 * The four legal documents share one component but keep separate top-level URLs,
 * so the slug arrives as a prop from the route table rather than a route param.
 * That keeps it typed as LegalSlug: an unroutable value cannot reach here.
 */
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const { t, i18n } = useTranslation();

  const doc = pick(LEGAL_DOCS[slug], i18n.language);

  return (
    <DocPage
      doc={doc}
      path={`/${slug}`}
      crumbs={[
        { name: t('nav.home'), href: '/' },
        { name: t('nav.legal') },
        { name: t(LEGAL_LABEL_KEYS[slug]) },
      ]}
      footer={
        <p className="mt-10 text-xs leading-relaxed text-ink-400">{t('content.legalNotice')}</p>
      }
    />
  );
}

const HELP_LABEL_KEYS: Record<HelpSlug, string> = {
  kargo: 'footer.shipping',
  iade: 'footer.returns',
  bakim: 'footer.leatherCare',
};

export function HelpArticlePage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const key = slug as HelpSlug | undefined;
  const source = key ? HELP_DOCS[key] : undefined;

  if (!key || !source) return <Navigate to="/404" replace />;

  const doc = pick(source, i18n.language);

  return (
    <DocPage
      doc={doc}
      path={`/yardim/${key}`}
      crumbs={[
        { name: t('nav.home'), href: '/' },
        { name: t('nav.help'), href: '/yardim' },
        { name: t(HELP_LABEL_KEYS[key]) },
      ]}
      footer={<StillStuck />}
    />
  );
}

const HELP_TOPICS = [
  { to: '/yardim/kargo', icon: PackageCheck, labelKey: 'footer.shipping', bodyKey: 'home.valueShippingBody' },
  { to: '/yardim/iade', icon: RotateCcw, labelKey: 'footer.returns', bodyKey: 'home.valueReturnBody' },
  { to: '/yardim/bakim', icon: Sparkles, labelKey: 'footer.leatherCare', bodyKey: 'home.valueQualityBody' },
  { to: '/yardim/sss', icon: LifeBuoy, labelKey: 'footer.faq', bodyKey: 'content.faqSubtitle' },
] as const;

export function HelpHubPage() {
  const { t } = useTranslation();

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo title={t('content.helpTitle')} description={t('content.helpMetaDescription')} path="/yardim" />

      <Breadcrumbs items={[{ name: t('nav.home'), href: '/' }, { name: t('nav.help') }]} />

      <Reveal className="mt-8 max-w-2xl">
        <h1 className="text-headline text-balance">{t('content.helpTitle')}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500 text-pretty">{t('content.helpSubtitle')}</p>
      </Reveal>

      <div className="mt-12 grid gap-px border border-ink-100 bg-ink-100 sm:grid-cols-2">
        {HELP_TOPICS.map(({ to, icon: Icon, labelKey, bodyKey }) => (
          <Link key={to} to={to} className="group flex flex-col gap-3 bg-sand-50 p-8 transition-colors hover:bg-sand-100">
            <Icon className="h-6 w-6 text-tan-600" aria-hidden />

            <span className="flex items-center gap-2 font-display text-xl text-ink-900">
              {t(labelKey)}
              <ArrowUpRight className="h-4 w-4 text-ink-400 transition-transform duration-300 ease-velora group-hover:translate-x-1 group-hover:-translate-y-1" />
            </span>

            <span className="text-sm leading-relaxed text-ink-500 text-pretty">{t(bodyKey)}</span>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <StillStuck />
      </div>
    </div>
  );
}

export function FaqPage() {
  const { t, i18n } = useTranslation();

  const entries = pick(faqEntries, i18n.language);

  // Preserve the authoring order of the groups; Map keeps insertion order.
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();

    entries.forEach((entry) => {
      const bucket = map.get(entry.group);
      if (bucket) bucket.push(entry);
      else map.set(entry.group, [entry]);
    });

    return [...map.entries()];
  }, [entries]);

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo
        title={t('content.faqTitle')}
        description={t('content.faqMetaDescription')}
        path="/yardim/sss"
        jsonLd={[buildFaqJsonLd(entries)]}
      />

      <Breadcrumbs
        items={[
          { name: t('nav.home'), href: '/' },
          { name: t('nav.help'), href: '/yardim' },
          { name: t('footer.faq') },
        ]}
      />

      <Reveal className="mt-8 max-w-2xl">
        <h1 className="text-headline text-balance">{t('content.faqTitle')}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500 text-pretty">{t('content.faqSubtitle')}</p>
      </Reveal>

      <div className="mt-12 max-w-3xl space-y-12">
        {grouped.map(([group, groupEntries], groupIndex) => (
          <section key={group}>
            <h2 className="label-caps mb-2 text-tan-600">{group}</h2>

            <DisclosureGroup>
              {groupEntries.map((entry, index) => (
                <Disclosure
                  key={entry.question}
                  title={entry.question}
                  // Open the very first row so the pattern is obvious at a glance.
                  defaultOpen={groupIndex === 0 && index === 0}
                >
                  {entry.answer}
                </Disclosure>
              ))}
            </DisclosureGroup>
          </section>
        ))}
      </div>

      <div className="mt-12 max-w-3xl">
        <StillStuck />
      </div>
    </div>
  );
}
