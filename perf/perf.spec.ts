import { test, expect } from '@playwright/test';
import { PAGES, DEFAULT_BUDGET, type Mode } from './pages';
import { measure, record, throttleCpu } from './harness';

// На каждую страницу — один тест на проект: открыть, дождаться постоянного состояния, снять idle → scroll (2 прохода) → mouse.
// Бюджет проверяется мягко (expect.soft): видно ВСЕ провалы сразу, а не только первый.
for (const pg of PAGES) {
  test(pg.name, async ({ page }, info) => {
    test.setTimeout(90_000);
    const project = info.project.name;
    const cpu = Number((info.project.metadata as { cpu?: number })?.cpu || 1);
    await throttleCpu(page, cpu);
    const sep = pg.url.includes('?') ? '&' : '?';
    await page.goto(pg.url + sep + 'fps=0', { waitUntil: 'load' });      // плашку FPS убираем — она сама стоит кадров
    if (pg.ready) await page.waitForSelector(pg.ready, { state: 'attached', timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(pg.settleMs ?? 2000);
    const budget = { ...DEFAULT_BUDGET, ...(pg.budget?.['*'] || {}), ...(pg.budget?.[project] || {}) };
    const quality = await page.evaluate(() => document.documentElement.dataset.quality || '');

    const runs: Array<[string, Mode]> = [['idle', 'idle'], ['scroll-first', 'scroll'], ['scroll', 'scroll'], ['mouse', 'mouse']];
    for (const [label, mode] of runs) {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      const s = await measure(page, mode);
      const min = label === 'scroll-first' ? undefined : budget[mode];
      record(info, { page: pg.name, project, cpu, quality, mode: label, ...s, budget: min ?? null });
      if (min) expect.soft(s.fps, `${pg.name} · ${project} · ${label}: ${s.fps} fps (p95 ${s.p95} ms, долгих кадров ${s.long}) — бюджет ≥ ${min}`).toBeGreaterThanOrEqual(min);
    }
  });
}
