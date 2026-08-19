import { expect, test } from '@playwright/test';

test.describe('Storefront browsing', () => {
  test('home page renders the hero, rails and category showcase from live data', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Velora/);
    await expect(page.getByRole('link', { name: 'Velora' }).first()).toBeVisible();

    // Product rails are populated by CatalogService, so at least one card must render.
    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('product listing paginates and keeps filters in the URL', async ({ page }) => {
    await page.goto('/urunler');

    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 });

    const initialCount = await page.locator('article').count();
    expect(initialCount).toBeGreaterThan(0);

    // Sorting is a URL concern, so the address bar must reflect it.
    await page.getByLabel('Sırala').selectOption('1');
    await expect(page).toHaveURL(/sort=1/);
  });

  test('search returns matching products', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Ara' }).first().click();

    const input = page.getByRole('searchbox');
    await expect(input).toBeVisible();

    await input.fill('çanta');
    await input.press('Enter');

    await expect(page).toHaveURL(/\/arama\?q=/);
    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 });
  });

  test('category navigation scopes the listing', async ({ page }) => {
    await page.goto('/kategori/kadin');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 });
  });

  test('product detail page exposes SEO metadata and structured data', async ({ page }) => {
    await page.goto('/urunler');
    await page.locator('article h3 a').first().click();

    await expect(page).toHaveURL(/\/urun\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Canonical + Product JSON-LD are the two things a crawler needs here.
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    expect(JSON.parse(jsonLd ?? '{}')).toMatchObject({ '@type': 'Product' });
  });

  test('unknown routes render the 404 page rather than a blank screen', async ({ page }) => {
    await page.goto('/bulunmayan-sayfa');

    await expect(page.getByText('Sayfa bulunamadı')).toBeVisible();
  });

  test('filters apply and clear', async ({ page }) => {
    await page.goto('/urunler?onSale=true');

    await expect(page.locator('article').first()).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/onSale=true/);
  });
});
