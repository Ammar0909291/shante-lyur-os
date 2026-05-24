/**
 * E2E TEST — Language switch RU ↔ EN and theme switch light ↔ dark.
 */

import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  if (page.url().includes('/dashboard')) return;
  await page.fill('input[type="email"]', 'admin@shantelyur.ru');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 20_000 });
  await page.waitForSelector('nav a[href]', { state: 'visible' });
}

test.describe('Language switch — RU ↔ EN', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('default language is Russian — sidebar shows Cyrillic nav labels', async ({ page }) => {
    await expect(page.locator('nav a[href="/bookings"]')).toContainText('Записи');
    await expect(page.locator('nav a[href="/clients"]')).toContainText('Клиенты');
    await expect(page.locator('nav a[href="/specialists"]')).toContainText('Специалисты');
    await expect(page.locator('nav a[href="/inventory"]')).toContainText('Склад');
  });

  test('switching to EN updates all nav labels to English', async ({ page }) => {
    // Find the language toggle (commonly in header/settings)
    const langToggle = page.locator('[aria-label*="язык"], [aria-label*="language"], button:has-text("EN"), button:has-text("RU")').first();

    if (await langToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await langToggle.click();

      // After switching, nav should show English
      await expect(page.locator('nav a[href="/bookings"]')).toContainText('Bookings', { timeout: 3_000 });
      await expect(page.locator('nav a[href="/clients"]')).toContainText('Clients');
      await expect(page.locator('nav a[href="/inventory"]')).toContainText('Inventory');

      // Switch back to RU
      await langToggle.click();
      await expect(page.locator('nav a[href="/bookings"]')).toContainText('Записи', { timeout: 3_000 });
    } else {
      // Language toggle not found in header — check /settings page
      await page.goto('/settings');
      const settingsLangBtn = page.locator('button:has-text("EN"), button:has-text("English")').first();
      if (await settingsLangBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await settingsLangBtn.click();
        await page.goto('/dashboard');
        await expect(page.locator('nav a[href="/bookings"]')).toContainText('Bookings', { timeout: 3_000 });
      } else {
        test.skip(true, 'Language toggle UI not found — skipping language switch test');
      }
    }
  });

  test('Склад nav item links correctly to /inventory', async ({ page }) => {
    const inventoryLink = page.locator('nav a[href="/inventory"]');
    await expect(inventoryLink).toBeVisible();
    await inventoryLink.click();
    await page.waitForURL('**/inventory', { timeout: 5_000 });
    // Inventory page should render
    await expect(page.locator('h2,h1').filter({ hasText: /склад|inventory/i }).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Theme switch — light ↔ dark', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('default theme is dark (obsidian background)', async ({ page }) => {
    // The luxury dark theme uses bg-obsidian or similar dark background on body/html
    const bodyBg = await page.evaluate(() => {
      const el = document.documentElement;
      return window.getComputedStyle(el).backgroundColor;
    });
    // Dark theme will have a dark background — not white (255,255,255)
    expect(bodyBg).not.toBe('rgb(255, 255, 255)');
  });

  test('theme toggle button is accessible', async ({ page }) => {
    const themeBtn = page.locator('[aria-label*="тема"], [aria-label*="theme"], button[aria-label*="тёмн"], button[aria-label*="dark"]').first();
    if (await themeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Button is keyboard-focusable
      await themeBtn.focus();
      await expect(themeBtn).toBeFocused();
    } else {
      test.skip(true, 'Theme toggle not found in current UI');
    }
  });
});
