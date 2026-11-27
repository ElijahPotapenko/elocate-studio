import { defineConfig, devices } from '@playwright/test';

// Общий пул перф-тестов (perf/): `npm run perf`. Отчёт — perf/results/REPORT.md, эталон — perf/baseline.json
// (`npm run perf:baseline` — принять текущие цифры). Функциональные тесты (`npm test`) — отдельно и быстрые.
// workers: 1 — замеры кадров не делят машину с соседними тестами.
export default defineConfig({
  testDir: './perf',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  globalSetup: './perf/global-setup.ts',
  globalTeardown: './perf/global-teardown.ts',
  use: { baseURL: 'http://localhost:4321', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'npm run dev', url: 'http://localhost:4321', reuseExistingServer: true, timeout: 30_000 },
  projects: [
    // слабый ноутбук: Chromium, процессор ×4 медленнее
    { name: 'chromium-cpu4x', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, metadata: { cpu: 4 } },
    // Firefox — основной браузер Элайджи; в headless рисует программно (худший случай отрисовки)
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    // телефон среднего класса: узкий экран + процессор ×4
    { name: 'mobile-cpu4x', use: { ...devices['Pixel 7'] }, metadata: { cpu: 4 } },
  ],
});
