// Харнес замеров: всё меряется В СТРАНИЦЕ через requestAnimationFrame — так же, как плашка FPS (_shared/fps.js).
import type { Page, TestInfo } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Mode } from './pages';

export type Sample = { fps: number; p95: number; worst: number; long: number; frames: number };
export const RESULTS = path.resolve('perf', 'results');   // от корня проекта (ESM — без __dirname)

/** Chromium: замедлить процессор (эмуляция слабой машины). Firefox такого не умеет — меряем как есть. */
export async function throttleCpu(page: Page, rate: number) {
  if (!rate || rate <= 1 || page.context().browser()?.browserType().name() !== 'chromium') return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

/** Один замер: idle — ничего не делаем; scroll — 6 px за кадр вниз (с начала страницы); mouse — водим мышью по экрану. */
export async function measure(page: Page, mode: Mode, ms = 3000): Promise<Sample> {
  const vp = page.viewportSize() || { width: 1440, height: 900 };
  let stop = false;
  const mouse = mode === 'mouse' ? (async () => {
    let x = 0;
    while (!stop) { x += 23; await page.mouse.move(80 + (x % (vp.width - 160)), vp.height * (0.3 + 0.4 * Math.abs(Math.sin(x / 300)))); await page.waitForTimeout(16); }
  })() : null;
  const r = await page.evaluate(async ({ mode, ms }) => {
    const dts: number[] = []; let last = performance.now(); const t0 = last;
    if (mode === 'scroll') scrollTo(0, 0);
    await new Promise<void>((res) => {
      const f = (t: number) => { dts.push(t - last); last = t; if (mode === 'scroll') scrollBy(0, 6); if (t - t0 < ms) requestAnimationFrame(f); else res(); };
      requestAnimationFrame(f);
    });
    dts.shift();
    const sum = dts.reduce((a, b) => a + b, 0), s = [...dts].sort((a, b) => a - b);
    return { fps: Math.round(1000 / (sum / dts.length)), p95: Math.round(s[Math.floor(s.length * 0.95)]), worst: Math.round(s[s.length - 1]),
      long: dts.filter((d) => d > 50).length, frames: dts.length };
  }, { mode, ms });
  stop = true; await mouse;
  return r;
}

/** Записать результат (сырьё для отчёта) + аннотация в отчёт Playwright. */
export function record(info: TestInfo, row: Record<string, unknown>) {
  mkdirSync(RESULTS, { recursive: true });
  appendFileSync(path.join(RESULTS, 'raw.jsonl'), JSON.stringify(row) + '\n');
  info.annotations.push({ type: 'perf', description: JSON.stringify(row) });
}
