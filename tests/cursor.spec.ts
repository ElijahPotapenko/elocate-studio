import { test, expect, type Page } from '@playwright/test';

/*
 * Кастомный курсор (точка вместо нативного) ВЫКЛЮЧЕН целиком 2026-11-18 по слову Элайджи:
 * несмотря на починенный зазор «нативный/точка» на полной навигации (см. git history +
 * прошлую версию этого файла — 12/12 зелёных в Chromium И Firefox), баг на проде всё ещё
 * воспроизводился вживую. Вместо дальнейших догадок — выключили initCursor() целиком
 * (src/scripts/cursor.js returns early) и вернёмся отдельным заходом.
 *
 * Этот файл теперь держит ОБРАТНЫЙ инвариант: нативный курсор обязан быть виден ВСЕГДА,
 * на любой странице, до и после движения мыши, без исключений — никакой .cursor-dot,
 * никакого cursor:none. Если initCursor() случайно включат заново не починив баг, это
 * первое, что должно покраснеть.
 */

async function nativeCursorVisible(page: Page) {
  return page.evaluate(() => {
    const cursor = getComputedStyle(document.documentElement).cursor;
    const dotExists = !!document.querySelector('.cursor-dot');
    return { cursor, dotExists };
  });
}

test.describe('custom cursor — disabled, native cursor only', () => {
  test('home page: native cursor visible before and after mouse move, no dot ever created', async ({ page }) => {
    await page.goto('/');
    let state = await nativeCursorVisible(page);
    expect(state.cursor).not.toBe('none');
    expect(state.dotExists).toBe(false);

    await page.mouse.move(400, 300);
    state = await nativeCursorVisible(page);
    expect(state.cursor).not.toBe('none');
    expect(state.dotExists).toBe(false);
  });

  test('holds across repeated full-page navigations', async ({ page }) => {
    test.slow(); // /demos/support-bot embeds a live iframe — 'load' waits on it too, slow under parallel workers
    const pages = ['/', '/demos/nova/index.html', '/demos/analytics-pulse/index.html', '/', '/demos/support-bot/index.html', '/'];
    for (const url of pages) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(250, 250);
      const state = await nativeCursorVisible(page);
      expect(state.cursor, `on ${url}`).not.toBe('none');
      expect(state.dotExists, `on ${url}`).toBe(false);
    }
  });

  test('case pages never hid the native cursor to begin with (no cursor.js there)', async ({ page }) => {
    for (const url of ['/demos/nova/index.html', '/demos/analytics-pulse/index.html', '/demos/support-bot/index.html']) {
      await page.goto(url);
      const state = await nativeCursorVisible(page);
      expect(state.cursor, url).not.toBe('none');
    }
  });
});
