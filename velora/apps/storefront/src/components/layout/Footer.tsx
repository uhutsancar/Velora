import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks';
import { useGetCategoryTreeQuery } from '@/store/api/catalogApi';

const HELP_LINKS = [
  { label: 'Kargo ve Teslimat', to: '/yardim/kargo' },
  { label: 'İade ve Değişim', to: '/yardim/iade' },
  { label: 'Sipariş Takibi', to: '/hesabim/siparisler' },
  { label: 'Deri Bakımı', to: '/yardim/bakim' },
  { label: 'Sıkça Sorulan Sorular', to: '/yardim/sss' },
];

const CORPORATE_LINKS = [
  { label: 'Hakkımızda', to: '/hakkimizda' },
  { label: 'Atölyemiz', to: '/atolye' },
  { label: 'Sürdürülebilirlik', to: '/surdurulebilirlik' },
  { label: 'İletişim', to: '/iletisim' },
];

const LEGAL_LINKS = [
  { label: 'Gizlilik Politikası', to: '/gizlilik' },
  { label: 'Kullanım Koşulları', to: '/kosullar' },
  { label: 'KVKK Aydınlatma Metni', to: '/kvkk' },
  { label: 'Çerez Politikası', to: '/cerez' },
];

export function Footer() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: categories = [] } = useGetCategoryTreeQuery();
  const [email, setEmail] = useState('');

  const subscribe = (event: FormEvent) => {
    event.preventDefault();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast('Geçerli bir e-posta adresi girin', 'error');
      return;
    }

    // No newsletter service is wired up yet; the form validates and acknowledges
    // rather than pretending to have subscribed the address somewhere.
    toast('Bültene kayıt talebiniz alındı', 'success');
    setEmail('');
  };

  return (
    <footer className="mt-24 bg-ink-900 text-sand-100">
      <div className="border-b border-white/10">
        <div className="container-velora grid gap-8 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-2xl text-sand-50">{t('home.newsletterTitle')}</h2>
            <p className="mt-2 text-sm text-sand-100/70">{t('home.newsletterBody')}</p>
          </div>

          <form onSubmit={subscribe} className="flex gap-3">
            <label htmlFor="newsletter-email" className="sr-only">
              {t('home.newsletterPlaceholder')}
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('home.newsletterPlaceholder')}
              className="flex-1 border-b border-white/25 bg-transparent py-3 text-sm text-sand-50 placeholder:text-sand-100/40 focus:border-tan-400 focus:outline-none"
            />
            <Button type="submit" variant="secondary" size="sm">
              {t('home.newsletterCta')}
            </Button>
          </form>
        </div>
      </div>

      <div className="container-velora grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="font-display text-2xl tracking-[0.28em] text-sand-50">VELORA</span>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand-100/70">{t('common.tagline')}</p>

          <ul className="mt-6 space-y-2.5 text-sm text-sand-100/70">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> Karaköy, İstanbul
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <a href="tel:+902125550100" className="hover:text-sand-50">
                +90 212 555 01 00
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <a href="mailto:merhaba@velora.com" className="hover:text-sand-50">
                merhaba@velora.com
              </a>
            </li>
          </ul>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Instagram"
            className="mt-6 inline-flex h-10 w-10 items-center justify-center border border-white/20 text-sand-100 transition-colors hover:border-tan-400 hover:text-tan-400"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </div>

        <FooterColumn
          title={t('nav.categories')}
          links={categories.map((category) => ({
            label: category.name,
            to: `/kategori/${category.slug}`,
          }))}
        />
        <FooterColumn title="Yardım" links={HELP_LINKS} />
        <FooterColumn title="Kurumsal" links={CORPORATE_LINKS} />
      </div>

      <div className="border-t border-white/10">
        <div className="container-velora flex flex-col gap-4 py-6 text-xs text-sand-100/50 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Velora. Tüm hakları saklıdır.</p>

          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors hover:text-sand-50">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; to: string }> }) {
  return (
    <div>
      <h3 className="label-caps mb-4 text-sand-50">{title}</h3>
      <ul className="space-y-2.5 text-sm text-sand-100/70">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="link-underline transition-colors hover:text-sand-50">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
