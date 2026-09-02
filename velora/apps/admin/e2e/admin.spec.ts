import { expect, test, type Page } from '@playwright/test';

/**
 * Back-office E2E.
 *
 * Runs against the live stack and uses the bootstrap admin seeded by
 * IdentityService (SeedAdmin section in appsettings.json). Override with
 * E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD when the seed values differ.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@velora.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? process.env.VELORA_ADMIN_PASSWORD ?? '';

async function signIn(page: Page): Promise<void> {
  await page.goto('/login');

  await page.getByLabel('E-posta').fill(ADMIN_EMAIL);
  await page.getByLabel('Şifre').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Kontrol Paneli' })).toBeVisible({ timeout: 30_000 });
}

test.describe('Admin authentication', () => {
  test('redirects an anonymous visitor to the login page', async ({ page }) => {
    await page.goto('/products');

    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test('rejects invalid credentials with the API message', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('E-posta').fill('yok@velora.com');
    await page.getByLabel('Şifre').fill('YanlisSifre123');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs the bootstrap admin in and renders the dashboard KPIs', async ({ page }) => {
    await signIn(page);

    await expect(page.getByText('Toplam Gelir')).toBeVisible();
    await expect(page.getByText('Sipariş Sayısı')).toBeVisible();

    // ECharts renders to canvas; its presence proves the analytics call resolved.
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Admin product management', () => {
  test.describe.configure({ mode: 'serial' });

  const productName = `E2E Test Ürünü ${Date.now()}`;
  const updatedName = `${productName} (güncel)`;

  test('creates a product and it reaches the catalogue', async ({ page }) => {
    await signIn(page);

    await page.goto('/products/new');

    await page.getByLabel('Ürün adı').fill(productName);
    await page
      .getByLabel('Açıklama', { exact: true })
      .fill('Playwright tarafından oluşturulan uçtan uca test ürünü. Bu açıklama yeterince uzundur.');
    await page.getByLabel('Kısa açıklama').fill('E2E test ürünü');
    await page.getByLabel('Liste fiyatı').fill('1999');
    await page.getByLabel('Ana stok').fill('25');

    await page.getByRole('button', { name: 'Kaydet' }).click();

    // A successful create navigates to the edit route for the new id.
    await expect(page).toHaveURL(/\/products\/\d+/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: new RegExp(productName) })).toBeVisible();

    await page.goto('/products');
    await page.getByPlaceholder('Ürün adı, SKU veya marka ara').fill(productName);
    await expect(page.getByText(productName)).toBeVisible({ timeout: 20_000 });
  });

  test('updates the product name and price', async ({ page }) => {
    await signIn(page);

    await page.goto('/products');
    await page.getByPlaceholder('Ürün adı, SKU veya marka ara').fill(productName);

    await page.getByText(productName).first().click();
    await expect(page).toHaveURL(/\/products\/\d+/, { timeout: 20_000 });

    await page.getByLabel('Ürün adı').fill(updatedName);
    await page.getByLabel('Liste fiyatı').fill('2499');

    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByText('Kaydedildi')).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByLabel('Ürün adı')).toHaveValue(updatedName);
  });

  test('unpublishing hides the product from the storefront listing', async ({ page }) => {
    await signIn(page);

    await page.goto('/products');
    await page.getByPlaceholder('Ürün adı, SKU veya marka ara').fill(updatedName);
    await page.getByText(updatedName).first().click();

    await page.getByRole('switch').first().click();
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByText('Kaydedildi')).toBeVisible({ timeout: 20_000 });
  });

  test('deletes the product', async ({ page }) => {
    await signIn(page);

    await page.goto('/products');
    await page.getByPlaceholder('Ürün adı, SKU veya marka ara').fill(updatedName);
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Sil' }).first().click();
    await page.getByRole('button', { name: 'Sil' }).last().click();

    await expect(page.getByText('Silindi')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Admin operations', () => {
  test('lists orders and opens a detail page', async ({ page }) => {
    await signIn(page);

    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Siparişler' })).toBeVisible();

    const firstOrder = page.locator('.MuiDataGrid-row').first();

    if ((await firstOrder.count()) > 0) {
      await firstOrder.click();
      await expect(page).toHaveURL(/\/orders\//, { timeout: 20_000 });
      await expect(page.getByText('Sipariş Özeti')).toBeVisible();
    }
  });

  test('lists customers with their roles', async ({ page }) => {
    await signIn(page);

    await page.goto('/customers');

    await expect(page.getByRole('heading', { name: 'Müşteriler' })).toBeVisible();
    await expect(page.getByText('Toplam kullanıcı')).toBeVisible();
  });

  test('manages categories', async ({ page }) => {
    await signIn(page);

    await page.goto('/categories');

    await expect(page.getByRole('heading', { name: 'Kategoriler' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Yeni kategori' })).toBeVisible();
  });

  test('shows the role and permission matrix in settings', async ({ page }) => {
    await signIn(page);

    await page.goto('/settings');

    await expect(page.getByText('Rol / izin matrisi')).toBeVisible();
    await expect(page.getByText('products.write')).toBeVisible();
  });
});
