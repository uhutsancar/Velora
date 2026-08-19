import { expect, type Page } from '@playwright/test';

/**
 * Shared helpers for the storefront E2E suite.
 *
 * The suite runs against the real stack, so every test that needs an account
 * registers a fresh one: a shared fixture user would make the specs
 * order-dependent and leave residue in the Identity database.
 */
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function makeTestUser(): TestUser {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    email: `e2e.${stamp}@velora.test`,
    password: 'VeloraE2E2026',
    firstName: 'Test',
    lastName: 'Kullanici',
  };
}

export async function register(page: Page, user: TestUser): Promise<void> {
  await page.goto('/kayit');

  await page.getByLabel('Ad', { exact: true }).fill(user.firstName);
  await page.getByLabel('Soyad', { exact: true }).fill(user.lastName);
  await page.getByLabel('E-posta', { exact: true }).fill(user.email);
  await page.getByLabel('Şifre', { exact: true }).fill(user.password);
  await page.getByLabel('Şifre tekrarı').fill(user.password);
  await page.getByRole('checkbox').check();

  await page.getByRole('button', { name: 'Hesap Oluştur' }).click();

  // Registration signs the user in and lands on the account page.
  await expect(page).toHaveURL(/\/hesabim/, { timeout: 20_000 });
}

export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/giris');

  await page.getByLabel('E-posta', { exact: true }).fill(user.email);
  await page.getByLabel('Şifre', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Giriş Yap' }).click();

  await expect(page).toHaveURL(/\/hesabim/, { timeout: 20_000 });
}

/** Opens the first product on the listing page and returns its name. */
export async function openFirstProduct(page: Page): Promise<string> {
  await page.goto('/urunler');

  const firstCard = page.locator('article').first();
  await expect(firstCard).toBeVisible({ timeout: 20_000 });

  const name = (await firstCard.locator('h3').first().innerText()).trim();
  await firstCard.locator('h3 a').first().click();

  await expect(page).toHaveURL(/\/urun\//);

  return name;
}
