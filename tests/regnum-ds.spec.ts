import { test, expect } from '@playwright/test';

// Regnum DS: любой текст демо стоит на одной из ролей типографики (tokens.css → --t-*).
// typeAudit() живёт в самой дизайн-системе — тест вызывает её в странице на трёх ширинах.
test.describe('Regnum design system', () => {
  for (const [w, h] of [[1440, 1000], [820, 1100], [390, 844]] as const) {
    test(`typography: every text on the demo uses a type role @${w}px`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width: w, height: h });
      // разделы показываются по одному — аудит проходит по каждому
      for (const route of ['hall', 'casino', 'live', 'sports', 'promos']) {
        await page.goto('/demos/regnum/index.html#/' + route, { waitUntil: 'networkidle' });
        await page.waitForSelector('#rg-loader', { state: 'detached' });
        for (let y = 0; y < 4000; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }  // Reveal-блоки показались
        await page.waitForTimeout(600);
        const r = await page.evaluate(async () => (await import('/demos/regnum/ds/components.js')).typeAudit());
        expect(r.total, route).toBeGreaterThan(20);
        expect(r.off, route + ':\n' + r.off.join('\n')).toEqual([]);
        expect(r.small, route + ' — текст мельче 11px:\n' + r.small.join('\n')).toEqual([]);
      }
    });
  }

  test('sidebar sections: hash routes, active item, back button, search jumps to casino', async ({ page }) => {
    test.slow();
    await page.goto('/demos/regnum/index.html?fps=0', { waitUntil: 'networkidle' });
    await page.waitForSelector('#rg-loader', { state: 'detached' });
    await expect(page.locator('.side .nav a.on')).toHaveText('Main hall');
    await expect(page.locator('.hero')).toBeVisible();
    await page.click('.side .nav a:has-text("Casino")');
    await expect(page).toHaveURL(/#\/casino$/);
    await expect(page.locator('.wheel-panel')).toBeVisible();
    await expect(page.locator('.hero')).toHaveCount(0);
    await page.click('.side .nav a:has-text("Sports")');
    await expect(page.locator('.soon')).toBeVisible();
    await page.goBack();
    await expect(page.locator('.side .nav a.on')).toHaveText('Casino');
    await page.goto('/demos/regnum/index.html?fps=0#/hall'); await page.waitForSelector('#rg-loader', { state: 'detached' });
    await page.fill('.top .field input', 'dra');
    await expect(page).toHaveURL(/#\/casino$/);
    await expect(page.locator('.games .game')).toHaveCount(1);
  });

  test('mobile: burger opens the sidebar drawer; nav / veil / Esc close it', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demos/regnum/index.html?fps=0', { waitUntil: 'networkidle' });
    await page.waitForSelector('#rg-loader', { state: 'detached' });
    await expect(page.locator('.side')).toBeHidden();
    await page.click('.burger');
    await expect(page.locator('.side.open')).toBeVisible();
    await expect(page.locator('.burger')).toHaveAttribute('aria-expanded', 'true');
    await page.click('.side .nav a:has-text("Casino")');
    await expect(page).toHaveURL(/#\/casino$/);
    await expect(page.locator('.side.open')).toHaveCount(0);
    await page.click('.burger'); await page.mouse.click(370, 500);
    await expect(page.locator('.side.open')).toHaveCount(0);
    await page.click('.burger'); await page.keyboard.press('Escape');
    await expect(page.locator('.side.open')).toHaveCount(0);
  });

  test('lab: every DS component has a story', async ({ page }) => {
    test.slow();
    await page.goto('/demos/regnum/lab/index.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#coverage')).toContainText('100%');
  });
});
