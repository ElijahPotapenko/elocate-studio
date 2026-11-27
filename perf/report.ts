// Отчёт по сырью raw.jsonl: таблица страница × проект × сценарий, бюджет, сравнение с эталоном (baseline.json).
// PERF_BASELINE=update — записать текущие цифры как новый эталон (делать, когда ускорение принято).
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { RESULTS } from './harness';

const BASELINE = path.resolve('perf', 'baseline.json');
type Row = { page: string; project: string; mode: string; fps: number; p95: number; long: number; budget: number | null; quality?: string };

export function setup() { rmSync(RESULTS, { recursive: true, force: true }); mkdirSync(RESULTS, { recursive: true }); }

export function teardown() {
  const raw = path.join(RESULTS, 'raw.jsonl');
  if (!existsSync(raw)) return;
  const rows: Row[] = readFileSync(raw, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const base: Record<string, number> = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const key = (r: Row) => `${r.page}|${r.project}|${r.mode}`;
  const lines = ['# Perf report', '', `${new Date().toISOString().slice(0, 16).replace('T', ' ')} · fps (p95 кадра, мс) · бюджет · Δ к эталону`, '',
    '| страница | проект | сценарий | fps | p95 | долгие | бюджет | Δ |', '|---|---|---|---:|---:|---:|---:|---:|'];
  for (const r of rows.sort((a, b) => (a.page + a.project).localeCompare(b.page + b.project))) {
    const ok = r.budget == null ? '' : r.fps >= r.budget ? ' ✅' : ' ❌';
    const b = base[key(r)], d = b == null ? '' : (r.fps - b > 0 ? '+' : '') + (r.fps - b);
    lines.push(`| ${r.page}${r.quality ? ` (${r.quality})` : ''} | ${r.project} | ${r.mode} | ${r.fps}${ok} | ${r.p95} | ${r.long} | ${r.budget ?? '—'} | ${d} |`);
  }
  const fails = rows.filter((r) => r.budget != null && r.fps < r.budget);
  lines.push('', fails.length ? `**Ниже бюджета: ${fails.length}** — ${fails.map((r) => `${r.page}/${r.project}/${r.mode} ${r.fps}<${r.budget}`).join(', ')}` : '**Все бюджеты выдержаны.**');
  writeFileSync(path.join(RESULTS, 'REPORT.md'), lines.join('\n') + '\n');
  if (process.env.PERF_BASELINE === 'update') writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(rows.map((r) => [key(r), r.fps])), null, 2) + '\n');
  console.log('\n' + lines.join('\n') + '\n');
}
