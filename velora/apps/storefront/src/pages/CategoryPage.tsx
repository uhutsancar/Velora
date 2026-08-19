import { useParams } from 'react-router-dom';
import { buildCategorySeo } from '@velora/shared';
import { Seo } from '@/components/seo/Seo';
import { Skeleton } from '@/components/ui/Feedback';
import { env } from '@/config/env';
import { useGetCategoryBySlugQuery } from '@/store/api/catalogApi';
import { mediaUrl } from '@/utils/media';
import ProductListPage from './ProductListPage';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const { data: category, isLoading } = useGetCategoryBySlugQuery(slug, { skip: !slug });

  if (isLoading) {
    return (
      <div className="container-velora py-12">
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const seo = category ? buildCategorySeo(category, env.siteUrl, env.siteName) : null;

  return (
    <>
      {seo && (
        <Seo
          title={seo.title}
          description={seo.description}
          path={`/kategori/${slug}`}
          image={category?.imageUrl}
        />
      )}

      {category?.imageUrl && (
        <section className="relative h-56 overflow-hidden bg-ink-900 md:h-72">
          <img
            src={mediaUrl(category.imageUrl) ?? ''}
            alt=""
            aria-hidden
            loading="eager"
            {...{ fetchpriority: 'high' }}
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-ink-950/20" />
          <div className="container-velora absolute inset-0 flex flex-col justify-end pb-8">
            <h1 className="font-display text-headline text-sand-50">{category.name}</h1>
            {category.description && (
              <p className="mt-2 max-w-xl text-sm text-sand-100/80 text-pretty">{category.description}</p>
            )}
          </div>
        </section>
      )}

      {/* The listing page owns filtering, sorting and paging; the category only scopes it. */}
      <ProductListPage
        categorySlug={slug}
        title={category?.name}
        description={seo?.description}
        path={`/kategori/${slug}`}
        // The hero above already owns this page's h1.
        headingLevel={category?.imageUrl ? 2 : 1}
      />
    </>
  );
}
