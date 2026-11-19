import { test, expect } from '@playwright/test';

test.describe('page loader', () => {
  test('removes itself from the DOM after load and unlocks scroll', async ({ page }) => {
    await page.goto('/');
    // к моменту возврата из goto() window.load уже случился — ждём лишь fade-out таймер лоадера
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 3000 });
    const overflow = await page.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('never shows without confirmed JS (html.js gate)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // #loader существует в разметке ВСЕГДА, но виден только через правило `html.js #loader{display:flex}` —
    // снимаем класс js (как если бы скрипты не выполнились) и проверяем, что оверлей схлопывается в display:none,
    // а не остаётся висеть поверх сайта навсегда.
    const displayWithoutJs = await page.evaluate(() => {
      document.documentElement.classList.remove('js');
      const loader = document.getElementById('loader');
      return loader ? getComputedStyle(loader).display : 'missing';
    });
    expect(displayWithoutJs).toBe('none');
  });

  test('respects prefers-reduced-motion — no stray animation left running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 3000 });
  });
});
