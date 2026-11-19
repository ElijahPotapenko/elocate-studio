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
    // Раньше ловил ЖИВОЙ #loader на domcontentloaded и снимал html.js — но под конкуренцией
    // воркеров (общий dev-сервер, несколько тестов разом) навигация сама иногда занимала больше
    // времени, чем полный жизненный цикл лоадера (450мс видимость + 600мс на удаление из DOM) —
    // к моменту evaluate() элемент был УЖЕ удалён, тест падал не из-за бага, а из-за своего же
    // тайминга. Проверяем правило `html.js #loader{display:flex}` напрямую: создаём изолированный
    // div#loader, не зависим от реального таймера реального лоадера на странице вообще.
    await page.goto('/');
    const displayWithoutJs = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.id = 'loader'; // правило в Layout.astro завязано на #loader — дубль id браузер не против для CSS-матчинга
      document.body.appendChild(probe);
      document.documentElement.classList.remove('js');
      const display = getComputedStyle(probe).display;
      probe.remove();
      return display;
    });
    expect(displayWithoutJs).toBe('none');
  });

  test('respects prefers-reduced-motion — no stray animation left running', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#loader')).toHaveCount(0, { timeout: 3000 });
  });
});
