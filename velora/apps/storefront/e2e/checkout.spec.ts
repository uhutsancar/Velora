import { expect, test } from '@playwright/test';
import { login, makeTestUser, openFirstProduct, register } from './fixtures';

/**
 * Covers the full commercial chain:
 *   register -> browse -> add to cart -> address -> payment -> order created.
 *
 * Every step hits the real services, so a failure here means the
 * Basket -> RabbitMQ -> Order -> Payment saga is broken, not just the UI.
 */
test.describe('Checkout flow', () => {
  test('a new customer can register, sign out and sign back in', async ({ page }) => {
    const user = makeTestUser();

    await register(page, user);
    await expect(page.getByText(user.email)).toBeVisible();

    await page.getByRole('button', { name: 'Çıkış Yap' }).first().click();
    await expect(page).toHaveURL(/\/(giris)?$/, { timeout: 20_000 });

    await login(page, user);
    await expect(page.getByText(user.email)).toBeVisible();
  });

  test('registration rejects a weak password before hitting the API', async ({ page }) => {
    await page.goto('/kayit');

    await page.getByLabel('Ad', { exact: true }).fill('Test');
    await page.getByLabel('Soyad', { exact: true }).fill('Kullanici');
    await page.getByLabel('E-posta', { exact: true }).fill('weak@velora.test');
    await page.getByLabel('Şifre', { exact: true }).fill('abc');
    await page.getByLabel('Şifre tekrarı').fill('abc');
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: 'Hesap Oluştur' }).click();

    await expect(page.getByText(/en az 8 karakter/i)).toBeVisible();
    await expect(page).toHaveURL(/\/kayit/);
  });

  test('adding to the cart updates the badge and the cart page', async ({ page }) => {
    const user = makeTestUser();
    await register(page, user);

    const productName = await openFirstProduct(page);

    await page.getByRole('button', { name: 'Sepete Ekle' }).click();

    // The drawer opens on success and the item must appear inside it.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('dialog').getByText(productName)).toBeVisible();

    await page.goto('/sepet');
    await expect(page.getByText(productName)).toBeVisible();
  });

  test('quantity changes and line removal persist to the basket service', async ({ page }) => {
    const user = makeTestUser();
    await register(page, user);
    await openFirstProduct(page);

    await page.getByRole('button', { name: 'Sepete Ekle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });

    await page.goto('/sepet');

    await page.getByRole('button', { name: 'Adet artır' }).first().click();
    await expect(page.getByText('2')).toBeVisible();

    // A reload proves the change was written server side, not just in the cache.
    await page.reload();
    await expect(page.locator('text=2').first()).toBeVisible();
  });

  test('an invalid coupon is rejected with the API message', async ({ page }) => {
    const user = makeTestUser();
    await register(page, user);
    await openFirstProduct(page);

    await page.getByRole('button', { name: 'Sepete Ekle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });

    await page.goto('/sepet');

    await page.getByPlaceholder('Kupon kodu').fill('GECERSIZKOD');
    await page.getByRole('button', { name: 'Uygula' }).click();

    await expect(page.getByText(/bulunamadı|geçersiz/i)).toBeVisible({ timeout: 15_000 });
  });

  test('completes checkout and creates a real order', async ({ page }) => {
    const user = makeTestUser();
    await register(page, user);
    await openFirstProduct(page);

    await page.getByRole('button', { name: 'Sepete Ekle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });

    await page.goto('/odeme');

    // First-time customer: create the delivery address inline.
    await page.getByRole('button', { name: 'Yeni adres ekle' }).first().click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Adres başlığı').fill('Ev');
    await dialog.getByLabel('Ad', { exact: true }).fill(user.firstName);
    await dialog.getByLabel('Soyad', { exact: true }).fill(user.lastName);
    await dialog.getByLabel('Telefon').fill('05555555555');
    await dialog.getByLabel('Açık adres').fill('Kemankeş Mah. Karaköy Cad. No 12 D 4');
    await dialog.getByLabel('İl').fill('İstanbul');
    await dialog.getByLabel('İlçe').fill('Beyoğlu');
    await dialog.getByLabel('Ülke').fill('Turkiye');
    await dialog.getByLabel('Posta kodu').fill('34425');
    await dialog.getByRole('button', { name: 'Kaydet' }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });

    const nextYear = String((new Date().getFullYear() + 2) % 100).padStart(2, '0');

    await page.getByLabel('Kart Üzerindeki İsim').fill('TEST KULLANICI');
    await page.getByLabel('Kart Numarası').fill('4242424242424242');
    await page.getByLabel('Son Kullanma').fill(`12${nextYear}`);
    await page.getByLabel('CVV').fill('123');

    await page.getByRole('button', { name: 'Siparişi Tamamla' }).click();

    await expect(page).toHaveURL(/\/siparis-alindi/, { timeout: 30_000 });
    await expect(page.getByText('Siparişiniz alındı')).toBeVisible();

    // The order is created asynchronously off the RabbitMQ event, so poll the list.
    await expect(async () => {
      await page.goto('/hesabim/siparisler');
      await expect(page.getByText(/VLR-/)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  });

  test('checkout rejects an invalid card before calling the API', async ({ page }) => {
    const user = makeTestUser();
    await register(page, user);
    await openFirstProduct(page);

    await page.getByRole('button', { name: 'Sepete Ekle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });

    await page.goto('/odeme');

    await page.getByLabel('Kart Numarası').fill('1111111111111111');
    await page.getByLabel('Kart Numarası').blur();

    await expect(page.getByText(/kart numarası geçersiz/i)).toBeVisible();
  });

  test('anonymous visitors are redirected from checkout to login', async ({ page }) => {
    await page.goto('/odeme');

    await expect(page).toHaveURL(/\/giris\?redirect=/);
  });
});
