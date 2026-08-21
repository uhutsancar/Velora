import { Formik, Form, Field, type FieldProps } from 'formik';
import { MessageSquare, Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  isNormalizedApiError,
  localeFor,
  reviewSchema,
  zodValidator,
  type ReviewFormValues,
} from '@velora/shared';
import { Button } from '@/components/ui/Button';
import { Textarea, Input } from '@/components/ui/Input';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Rating } from '@/components/ui/Display';
import { useAuth, useToast } from '@/hooks';
import { useCreateReviewMutation, useGetReviewsQuery, useGetReviewSummaryQuery } from '@/store/api/catalogApi';
import { cn } from '@/utils/cn';

export function ReviewSection({ productId }: { productId: number }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const { data: summary } = useGetReviewSummaryQuery(productId);
  const { data, isLoading } = useGetReviewsQuery({ productId, pageIndex: page, pageSize: 5 });
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation();

  const reviews = data?.items ?? [];
  const total = summary?.total ?? 0;

  const submit = async (values: ReviewFormValues) => {
    try {
      await createReview({
        productId,
        body: { rating: values.rating, title: values.title || null, comment: values.comment },
      }).unwrap();

      toast(t('product.reviewSubmitted'), 'success');
      setFormOpen(false);
    } catch (error) {
      toast(isNormalizedApiError(error) ? error.message : t('product.reviewFailed'), 'error');
    }
  };

  return (
    <section id="reviews" className="border-t border-ink-100 py-14">
      <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
        <div>
          <h2 className="text-title">{t('product.reviews')}</h2>

          {total > 0 && summary ? (
            <div className="mt-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-4xl text-ink-900">{summary.average.toFixed(1)}</span>
                <Rating value={summary.average} count={total} />
              </div>

              <ul className="mt-5 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.distribution[String(star)] ?? 0;
                  const percent = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <li key={star} className="flex items-center gap-3 text-xs text-ink-500">
                      <span className="flex w-8 items-center gap-0.5">
                        {star} <Star className="h-3 w-3 fill-tan-500 text-tan-500" aria-hidden />
                      </span>
                      <span className="h-1.5 flex-1 bg-ink-100">
                        <span className="block h-full bg-tan-500" style={{ width: `${percent}%` }} />
                      </span>
                      <span className="w-6 text-right tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">{t('product.noReviews')}</p>
          )}

          <div className="mt-6">
            {isAuthenticated ? (
              <Button variant="outline" onClick={() => setFormOpen((open) => !open)}>
                {t('product.writeReview')}
              </Button>
            ) : (
              <Button variant="outline" to="/giris">
                {t('nav.login')}
              </Button>
            )}
          </div>
        </div>

        <div>
          {formOpen && (
            <Formik<ReviewFormValues>
              initialValues={{ rating: 0, title: '', comment: '' }}
              validate={zodValidator<ReviewFormValues>(reviewSchema)}
              onSubmit={submit}
            >
              {({ values, setFieldValue, errors, touched }) => (
                <Form className="mb-10 space-y-4 border border-ink-100 bg-white p-6">
                  <div>
                    <span className="label-caps mb-2 block text-ink-500">{t('product.yourRating')}</span>
                    <div className="flex gap-1" role="radiogroup" aria-label={t('product.yourRating')}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          role="radio"
                          aria-checked={values.rating === star}
                          aria-label={t('product.starLabel', { count: star })}
                          onClick={() => void setFieldValue('rating', star)}
                          className="p-0.5"
                        >
                          <Star
                            className={cn(
                              'h-6 w-6 transition-colors',
                              star <= values.rating ? 'fill-tan-500 text-tan-500' : 'text-ink-200',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    {touched.rating && errors.rating && (
                      <p className="mt-1 text-xs text-wine-500">{errors.rating}</p>
                    )}
                  </div>

                  <Field name="title">
                    {({ field, meta }: FieldProps) => (
                      <Input
                        {...field}
                        label={t('product.reviewTitle')}
                        placeholder={t('product.reviewTitlePlaceholder')}
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>

                  <Field name="comment">
                    {({ field, meta }: FieldProps) => (
                      <Textarea
                        {...field}
                        label={t('product.reviewComment')}
                        placeholder={t('product.reviewCommentPlaceholder')}
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>

                  <div className="flex gap-3">
                    <Button type="submit" loading={submitting}>
                      {t('common.save')}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title={t('product.noReviews')}
              description={t('product.beFirstReview')}
            />
          ) : (
            <>
              <ul className="divide-y divide-ink-100">
                {reviews.map((review) => (
                  <li key={review.id} className="py-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-ink-900">{review.userName}</span>
                        <Rating value={review.rating} showCount={false} />
                      </div>
                      <time dateTime={review.createdAtUtc} className="text-xs text-ink-400">
                        {formatDate(review.createdAtUtc, localeFor(i18n.language))}
                      </time>
                    </div>

                    {review.title && <p className="mt-2 text-sm font-medium text-ink-800">{review.title}</p>}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600 text-pretty">{review.comment}</p>
                  </li>
                ))}
              </ul>

              {data && data.hasNext && (
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => current + 1)}>
                    {t('common.showMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
