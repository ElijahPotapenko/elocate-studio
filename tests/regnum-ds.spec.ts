import { test, expect } from '@playwright/test';

// Regnum DS: любой текст демо стоит на одной из ролей типографики (tokens.css → --t-*).
// typeAudit() живёт в самой дизайн-системе — тест вызывает её в странице на трёх ширинах.
test.describe('Regnum design system', () => {
  for (const [w, h] of [[1440, 1000], [820, 1100], [390, 844]] as const) {
    test(`typography: every text on the demo uses a type role @${w}px`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width: w, height: h });
      await page.goto('/demos/regnum/index.html', { waitUntil: 'networkidle' });
      for (let y = 0; y < 4000; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }  // Reveal-блоки показались
      await page.waitForTimeout(800);
      const r = await page.evaluate(async () => (await import('/demos/regnum/ds/components.js')).typeAudit());
      expect(r.total).toBeGreaterThan(100);
      expect(r.off, r.off.join('\n')).toEqual([]);
    });
  }

  test('lab: every DS component has a story', async ({ page }) => {
    test.slow();
    await page.goto('/demos/regnum/lab/index.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#coverage')).toContainText('100%');
  });
});
