/**
 * E2E TEST — Specialist Creation (PRIORITY — current reported bug)
 *
 * This is the highest-priority E2E test. It exercises the full UI flow:
 *   1. Log in as admin
 *   2. Navigate to /specialists
 *   3. Open "Добавить специалиста" modal
 *   4. Fill and submit the form
 *   5. Assert the new specialist appears in the list
 *
 * EXPECTED RESULT: Steps 1–4 succeed; step 5 CURRENTLY FAILS or is flaky
 * because the creation flow has a reported defect. When the bug is fixed,
 * this test must turn green as the primary acceptance criterion.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
  // Wait for the email input specifically — confirms React has hydrated and
  // the form is interactive. networkidle is unreliable in production Next.js
  // because Link prefetches keep connections open indefinitely.
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  if (page.url().includes('/dashboard')) return;
  await page.fill('input[type="email"]', 'admin@shantelyur.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  // Wait for the sidebar nav to be rendered before tests start asserting on it.
  await page.waitForSelector('nav a[href]', { state: 'visible' });
}

async function navigateToSpecialists(page: Page) {
  await page.click('a[href="/specialists"]');
  await page.waitForURL('**/specialists', { timeout: 8_000 });
  // Use h2 specifically: the layout Header also renders an h1 with the page
  // title "Специалисты", so getByRole('heading') matches 2 elements (strict violation).
  await expect(page.locator('h2').filter({ hasText: 'Специалисты' })).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Specialist creation — full CRM workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('PRIORITY: creates specialist and shows them in the active list', async ({ page }) => {
    await navigateToSpecialists(page);

    const uniqueEmail = `e2e-massagist-${Date.now()}@shantelyur-test.ru`;
    const firstName = 'Светлана';
    const lastName  = 'Орлова';

    // ── Open creation modal ───────────────────────────────────────────────────
    await page.click('button:has-text("Добавить специалиста")');
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).toBeVisible();

    // ── Fill form ─────────────────────────────────────────────────────────────
    await page.fill('input[placeholder="Мария"]', firstName);
    await page.fill('input[placeholder="Петрова"]', lastName);
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[placeholder="Косметолог, массажист..."]', 'Массажист SPA');
    await page.fill('textarea[placeholder="Краткое описание..."]', 'Сертифицированный SPA-массажист, опыт 5 лет');
    await page.fill('input[placeholder="5"]', '5');

    // ── Submit ────────────────────────────────────────────────────────────────
    await page.click('button[type="submit"]:has-text("Создать")');

    // Modal should close (no error message)
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).not.toBeVisible({ timeout: 5_000 });

    // ── Assert specialist appears in list ─────────────────────────────────────
    // This is the assertion that exposes the bug if it fails.
    await expect(
      page.locator('p').filter({ hasText: `${firstName} ${lastName}` }),
    ).toBeVisible({ timeout: 8_000 });

    // The specialist card should also show their specialization
    await expect(page.locator('text=Массажист SPA').first()).toBeVisible();
  });

  test('shows validation error when email is missing', async ({ page }) => {
    await navigateToSpecialists(page);

    await page.click('button:has-text("Добавить специалиста")');
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).toBeVisible();

    await page.fill('input[placeholder="Мария"]', 'Мария');
    await page.fill('input[placeholder="Петрова"]', 'Кузнецова');
    // Deliberately skip email — form has required attribute

    await page.click('button[type="submit"]:has-text("Создать")');

    // HTML5 required validation should prevent submission; modal stays open
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).toBeVisible();
  });

  test('shows API error when duplicate email is submitted', async ({ page }) => {
    await navigateToSpecialists(page);

    const duplicateEmail = 'admin@shantelyur.ru'; // always exists

    await page.click('button:has-text("Добавить специалиста")');
    await page.fill('input[placeholder="Мария"]', 'Анна');
    await page.fill('input[placeholder="Петрова"]', 'Тестова');
    await page.fill('input[type="email"]', duplicateEmail);
    await page.click('button[type="submit"]:has-text("Создать")');

    // Error message should appear in the modal
    await expect(page.locator('text=already exists').or(page.locator('text=уже существует'))).toBeVisible({ timeout: 5_000 });
    // Modal remains open
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).toBeVisible();
  });

  test('closes modal without creating when Cancel is clicked', async ({ page }) => {
    await navigateToSpecialists(page);

    await page.click('button:has-text("Добавить специалиста")');
    await page.fill('input[placeholder="Мария"]', 'Тест');

    await page.click('button:has-text("Отмена")');
    await expect(page.getByRole('heading', { name: 'Новый специалист' })).not.toBeVisible();
  });

  test('specialist page shows correct card with color indicator', async ({ page }) => {
    await navigateToSpecialists(page);

    // Switch to "Все" filter to see all specialists including seeded ones
    await page.click('button:has-text("Все")');
    await page.waitForLoadState('networkidle');

    // At least one specialist card should be visible (from seed data)
    const cards = page.locator('.rounded-2xl').filter({ hasText: 'Профиль специалиста →' });
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
  });
});
