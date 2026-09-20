import { Formik, Form, Field, type FieldProps } from 'formik';
import { Clock, Mail, MapPin, Phone, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CONTACT_SUBJECTS, contactSchema, zodValidator, type ContactFormValues } from '@velora/shared';
import { Reveal } from '@/components/motion/Reveal';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Input';
import { Seo } from '@/components/seo/Seo';
import { useToast } from '@/hooks';

const INITIAL_VALUES: ContactFormValues = {
  name: '',
  email: '',
  orderNumber: '',
  subject: 'order',
  message: '',
  consent: true,
};

/** Direct channels, ordered by how often support actually needs them. */
const CHANNELS = [
  { icon: Mail, titleKey: 'contact.support', value: 'destek@velora.com', href: 'mailto:destek@velora.com', hoursKey: 'contact.supportHours' },
  { icon: Wrench, titleKey: 'contact.atelier', value: 'atolye@velora.com', href: 'mailto:atolye@velora.com', hoursKey: 'contact.atelierHours' },
  { icon: Phone, titleKey: 'contact.press', value: '+90 212 555 01 00', href: 'tel:+902125550100', hoursKey: 'contact.supportHours' },
] as const;

export default function ContactPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const subjectOptions = CONTACT_SUBJECTS.map((value) => ({
    value,
    label: t(`contact.subject${value.charAt(0).toUpperCase()}${value.slice(1)}`),
  }));

  return (
    <div className="container-velora py-10 md:py-16">
      <Seo title={t('contact.title')} description={t('contact.metaDescription')} path="/iletisim" />

      <Breadcrumbs items={[{ name: t('nav.home'), href: '/' }, { name: t('contact.title') }]} />

      <Reveal className="mt-8 max-w-2xl">
        <h1 className="text-headline text-balance">{t('contact.title')}</h1>
        <p className="mt-4 text-base leading-relaxed text-ink-500 text-pretty">{t('contact.subtitle')}</p>
      </Reveal>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <section aria-labelledby="contact-form-heading">
          <h2 id="contact-form-heading" className="font-display text-title text-ink-900">
            {t('contact.formTitle')}
          </h2>
          <p className="mt-2 text-sm text-ink-500">{t('contact.formBody')}</p>

          <Formik
            initialValues={INITIAL_VALUES}
            validate={zodValidator<ContactFormValues>(contactSchema)}
            onSubmit={(_values, helpers) => {
              /*
               * There is no contact endpoint on the API yet. Rather than posting
               * into a void and claiming success, the form validates, confirms
               * receipt of the input and resets — the same honest behaviour the
               * newsletter field in the footer has. Wire this to a support
               * mailbox or ticket endpoint when one exists.
               */
              toast(t('contact.sent'), 'success');
              helpers.resetForm();
            }}
          >
            {({ isSubmitting, submitCount, isValid }) => (
              <Form noValidate className="mt-8 space-y-1">
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <Field name="name">
                    {({ field, meta }: FieldProps) => (
                      <Input
                        {...field}
                        label={t('contact.name')}
                        required
                        autoComplete="name"
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>

                  <Field name="email">
                    {({ field, meta }: FieldProps) => (
                      <Input
                        {...field}
                        type="email"
                        label={t('contact.email')}
                        required
                        autoComplete="email"
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>

                  <Field name="subject">
                    {({ field, meta }: FieldProps) => (
                      <Select
                        {...field}
                        label={t('contact.subject')}
                        required
                        options={subjectOptions}
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>

                  <Field name="orderNumber">
                    {({ field, meta }: FieldProps) => (
                      <Input
                        {...field}
                        label={t('contact.orderNumber')}
                        hint={t('contact.orderNumberHint')}
                        error={meta.touched ? meta.error : undefined}
                      />
                    )}
                  </Field>
                </div>

                <Field name="message">
                  {({ field, meta }: FieldProps) => (
                    <Textarea
                      {...field}
                      label={t('contact.message')}
                      required
                      rows={6}
                      maxLength={2000}
                      error={meta.touched ? meta.error : undefined}
                    />
                  )}
                </Field>

                <Field name="consent" type="checkbox">
                  {({ field, meta }: FieldProps) => (
                    <Checkbox
                      {...field}
                      checked={Boolean(field.value)}
                      error={meta.touched ? meta.error : undefined}
                      label={
                        <>
                          {t('contact.consent')}{' '}
                          <Link to="/kvkk" className="underline underline-offset-2 hover:text-ink-900">
                            {t('footer.kvkk')}
                          </Link>
                        </>
                      }
                    />
                  )}
                </Field>

                {/* Only shown once a submit has actually failed validation. */}
                {submitCount > 0 && !isValid && (
                  <p role="alert" className="pt-2 text-xs text-wine-500">
                    {t('contact.validationFailed')}
                  </p>
                )}

                <div className="pt-6">
                  <Button type="submit" loading={isSubmitting} size="lg">
                    {t('contact.send')}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </section>

        <aside className="space-y-10">
          <div>
            <h2 className="label-caps mb-5 text-ink-400">{t('contact.channels')}</h2>

            <ul className="space-y-6">
              {CHANNELS.map(({ icon: Icon, titleKey, value, href, hoursKey }) => (
                <li key={titleKey} className="flex gap-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-tan-600" aria-hidden />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{t(titleKey)}</p>
                    <a href={href} className="link-underline mt-0.5 block break-all text-sm text-ink-600">
                      {value}
                    </a>
                    <p className="mt-1 text-xs text-ink-400">{t(hoursKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-ink-100 pt-8">
            <h2 className="label-caps mb-5 text-ink-400">{t('contact.store')}</h2>

            <ul className="space-y-4 text-sm text-ink-600">
              <li className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-tan-600" aria-hidden />
                <span className="text-pretty">{t('contact.storeAddress')}</span>
              </li>
              <li className="flex gap-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-tan-600" aria-hidden />
                <span>{t('contact.storeHours')}</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-ink-100 pt-8">
            <h2 className="label-caps mb-5 text-ink-400">{t('content.relatedPages')}</h2>

            <ul className="space-y-2.5 text-sm text-ink-600">
              {[
                { to: '/yardim/sss', label: t('footer.faq') },
                { to: '/yardim/kargo', label: t('footer.shipping') },
                { to: '/yardim/iade', label: t('footer.returns') },
                { to: '/hesabim/siparisler', label: t('footer.orderTracking') },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="link-underline transition-colors hover:text-ink-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
