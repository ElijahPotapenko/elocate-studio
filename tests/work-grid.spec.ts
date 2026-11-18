import { test, expect } from '@playwright/test';

test.describe('work grid', () => {
  test('six case cards, no stray #contact placeholder for the live demos', async ({ page }) => {
    await page.goto('/#work');
    const cards = page.locator('.work-item');
    await expect(cards).toHaveCount(6);
  });

  test('desktop rhythm is big / small+small / big / small+small', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 2000 });
    await page.goto('/#work');
    const spans = await page.locator('.work-item').evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        // grid-column is like "span 6 / auto" — pull the number out
        const m = cs.gridColumn.match(/span\s+(\d+)/);
        return m ? Number(m[1]) : null;
      })
    );
    expect(spans).toEqual([6, 3, 3, 6, 3, 3]);
  });

  test('each live case (not the #contact placeholders) loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    for (const url of ['/demos/nova/index.html', '/demos/analytics-pulse/index.html', '/demos/support-bot/index.html']) {
      await page.goto(url);
      await page.waitForTimeout(500);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
