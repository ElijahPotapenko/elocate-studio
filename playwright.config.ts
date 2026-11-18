import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // dev-сервер один на все воркеры — полный параллелизм (default = # CPU cores) иногда топит
  // навигацию в таймаут под 2 движка × несколько тестов разом; 3 держит прогон быстрым и стабильным.
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Элайджа сверяет вёрстку в Firefox, не в Chrome (feedback_prefer-firefox-screenshots) —
    // курсор особенно: hide-native/show-dot может вести себя по-разному по движку.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
