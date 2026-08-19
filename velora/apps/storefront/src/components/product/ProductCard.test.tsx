import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { initI18n, type ProductListItem } from '@velora/shared';
import { describe, expect, it, vi } from 'vitest';
import { baseApi } from '@/store/api/baseApi';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import { ProductCard } from './ProductCard';

// The wishlist hook talks to the API; the card only needs its shape here.
vi.mock('@/hooks/useWishlist', () => ({
  useWishlist: () => ({
    productIds: [],
    isWishlisted: () => false,
    toggle: vi.fn(),
    isLoading: false,
    count: 0,
  }),
}));

const i18n = initI18n();

// jsdom reports en-US, so pin the locale: these assertions check Turkish copy
// and tr-TR currency formatting.
void i18n.changeLanguage('tr');

const baseProduct: ProductListItem = {
  id: 1,
  name: 'Aurora Omuz Çantası',
  slug: 'aurora-omuz-cantasi',
  shortDescription: 'El yapımı omuz çantası',
  price: 4890,
  discountPrice: 3990,
  effectivePrice: 3990,
  discountPercentage: 18,
  primaryImageUrl: 'https://example.com/a.jpg',
  hoverImageUrl: 'https://example.com/b.jpg',
  brandName: 'Velora Atelier',
  brandSlug: 'velora-atelier',
  categoryName: 'Omuz Çantası',
  categorySlug: 'kadin-omuz-cantasi',
  ratingAverage: 4.5,
  ratingCount: 12,
  totalStock: 24,
  inStock: true,
  isFeatured: true,
  isNew: true,
  tags: ['yeni'],
  swatches: [{ color: 'Siyah', colorHex: '#12100E' }],
};

function renderCard(product: ProductListItem) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer, ui: uiReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

  return render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ProductCard product={product} />
        </MemoryRouter>
      </I18nextProvider>
    </Provider>,
  );
}

describe('ProductCard', () => {
  it('renders the product name, brand and a link to the detail page', () => {
    renderCard(baseProduct);

    expect(screen.getByText('Aurora Omuz Çantası')).toBeInTheDocument();
    expect(screen.getByText('Velora Atelier')).toBeInTheDocument();

    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', '/urun/aurora-omuz-cantasi');
  });

  it('shows the discounted price and strikes through the list price', () => {
    const { container } = renderCard(baseProduct);

    // 3.990,00 is the effective price; 4.890,00 must appear struck through.
    expect(container.textContent).toContain('3.990');
    expect(container.querySelector('.line-through')?.textContent).toContain('4.890');
  });

  it('badges the discount percentage', () => {
    renderCard(baseProduct);

    expect(screen.getByText('%18')).toBeInTheDocument();
  });

  it('replaces the discount badge with a sold-out badge when stock is zero', () => {
    renderCard({ ...baseProduct, inStock: false, totalStock: 0 });

    expect(screen.getByText('Tükendi')).toBeInTheDocument();
    expect(screen.queryByText('%18')).not.toBeInTheDocument();
  });

  it('hides the quick add control for an out-of-stock product', () => {
    renderCard({ ...baseProduct, inStock: false, totalStock: 0 });

    expect(screen.queryByRole('button', { name: /hızlı ekle/i })).not.toBeInTheDocument();
  });

  it('asks for a variant choice instead of quick-adding when several colours exist', () => {
    renderCard({
      ...baseProduct,
      swatches: [
        { color: 'Siyah', colorHex: '#12100E' },
        { color: 'Taba', colorHex: '#8B5A2B' },
      ],
    });

    expect(screen.getByRole('button', { name: /seçenek seçin/i })).toBeInTheDocument();
  });

  it('falls back to the placeholder when the product has no image', () => {
    renderCard({ ...baseProduct, primaryImageUrl: null, hoverImageUrl: null });

    const image = screen.getByAltText('Aurora Omuz Çantası');
    expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });

  it('exposes an accessible wishlist toggle', () => {
    renderCard(baseProduct);

    const button = screen.getByRole('button', { name: /favorilere ekle/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
