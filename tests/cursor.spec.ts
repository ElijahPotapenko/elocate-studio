import { test, expect, type Page } from '@playwright/test';

/*
 * Баг (2026-11-18): между полной навигацией на страницу и первым движением мыши
 * нативный курсор был спрятан (cursor:none на <html>) сразу при запуске cursor.js,
 * а кастомная точка (.cursor-dot) до первого mousemove стоит в (0,0) — т.е. НИЧЕГО
 * не видно на реальной позиции мыши. Особенно заметно при частых полных навигациях
 * (эта витрина — не SPA, каждый переход между страницами — полная перезагрузка).
 *
 * Инвариант, который тест обязан держать на КАЖДОЙ навигации, а не только на первой:
 * либо нативный курсор видим (cursor !== 'none'), либо кастомная точка стоит ровно
 * на позиции курсора и видима (opacity > 0). Никогда — ни то, ни другое.
 */

async function cursorState(page: Page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const dot = document.querySelector('.cursor-dot') as HTMLElement | null;
    const nativeCursor = getComputedStyle(html).cursor;
    const dotVisible = !!dot && getComputedStyle(dot).opacity !== '0' && html.classList.contains('has-custom-cursor');
    return { nativeCursor, dotVisible, dotTransform: dot?.style.transform ?? null };
  });
}

function somethingIsVisibleAtCursor(state: { nativeCursor: string; dotVisible: boolean }) {
  return state.nativeCursor !== 'none' || state.dotVisible;
}

test.describe('custom cursor — never fully invisible', () => {
  test('native cursor visible immediately after a fresh page load, before any mouse move', async ({ page }) => {
    await page.goto('/');
    const state = await cursorState(page);
    expect(state.nativeCursor, 'native OS cursor must stay visible until the dot is correctly positioned').not.toBe('none');
    expect(state.dotVisible).toBe(false);
  });

  test('dot takes over seamlessly on the first real mouse move', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(400, 300);
    const state = await cursorState(page);
    expect(somethingIsVisibleAtCursor(state)).toBe(true);
    expect(state.nativeCursor).toBe('none');
    expect(state.dotVisible).toBe(true);
    expect(state.dotTransform).toContain('400px, 300px');
  });

  test('invariant holds across repeated full-page navigations (the reported repro)', async ({ page }) => {
    const casePages = ['/demos/nova/index.html', '/demos/analytics-pulse/index.html', '/', '/demos/support-bot/index.html', '/'];
    await page.goto('/');
    await page.mouse.move(300, 300);
    expect(somethingIsVisibleAtCursor(await cursorState(page))).toBe(true);

    for (const url of casePages) {
      await page.goto(url);
      // проверяем мгновенно, ДО первого mousemove на новой странице — именно тут был баг
      const before = await cursorState(page);
      expect(somethingIsVisibleAtCursor(before), `right after navigating to ${url}, before any mousemove`).toBe(true);

      await page.mouse.move(250, 250);
      const after = await cursorState(page);
      expect(somethingIsVisibleAtCursor(after), `on ${url} after a mousemove`).toBe(true);
    }
  });

  test('case pages (static, no cursor.js) always show the plain native cursor', async ({ page }) => {
    for (const url of ['/demos/nova/index.html', '/demos/analytics-pulse/index.html', '/demos/support-bot/index.html']) {
      await page.goto(url);
      const cursor = await page.evaluate(() => getComputedStyle(document.documentElement).cursor);
      expect(cursor, `${url} must never hide the native cursor — it has no custom-cursor script`).not.toBe('none');
    }
  });

  test('mouse leaving and re-entering the window never leaves both cursor and dot hidden', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(400, 300);
    await page.evaluate(() => window.dispatchEvent(new Event('mouseleave')));
    await page.evaluate(() => window.dispatchEvent(new Event('mouseenter')));
    const state = await cursorState(page);
    expect(somethingIsVisibleAtCursor(state)).toBe(true);
  });
});
