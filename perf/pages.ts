// Общий пул перф-тестов: КАЖДЫЙ продукт — одна строка. Новый продукт = добавить сюда (+ при желании свои бюджеты).
// Бюджеты — минимальные кадры в секунду по сценарию. Не тянуть вниз «чтобы зеленело»: бюджет = цель, красный = работа.
export type Mode = 'idle' | 'scroll' | 'mouse';
export type Budget = Partial<Record<Mode, number>>;
export type PerfPage = {
  name: string;
  url: string;
  /** сколько ждать после load (экраны загрузки, автокачество, ленивые бандлы) */
  settleMs?: number;
  /** дождаться селектора (например, решения автокачества html[data-quality]) — надёжнее фиксированной паузы */
  ready?: string;
  /** бюджеты по проекту (имя проекта из playwright.perf.config.ts); '*' — для всех */
  budget?: Record<string, Budget>;
};

export const DEFAULT_BUDGET: Budget = { idle: 50, scroll: 40, mouse: 45 };

export const PAGES: PerfPage[] = [
  { name: 'elocate-home', url: '/' },
  { name: 'nova', url: '/demos/nova/index.html', settleMs: 3500 },
  { name: 'analytics-pulse', url: '/demos/analytics-pulse/index.html' },
  { name: 'support-bot', url: '/demos/support-bot/index.html', settleMs: 3000 },
  // экран загрузки (~1–3 с) + замер автокачества (1.5 с) — ждём, пока страница придёт в своё постоянное состояние
  { name: 'regnum', url: '/demos/regnum/index.html', settleMs: 1000, ready: 'html[data-quality]' },
  { name: 'regnum-casino', url: '/demos/regnum/index.html#/casino', settleMs: 1000, ready: 'html[data-quality]' },
  { name: 'regnum-lab', url: '/demos/regnum/lab/index.html', settleMs: 3000 },
];
