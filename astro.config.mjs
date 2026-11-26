import { defineConfig } from 'astro/config';

// Elocate Studio — статический сайт-визитка. Деплой: Netlify (astro build → dist).
export default defineConfig({
  site: 'https://elocate.netlify.app',
  // Кусок кристалла (three.js, ~520 КБ) грузится ОТДЕЛЬНО, динамическим import() после страницы (Layout.astro) — первую отрисовку
  // не держит. Меньше не выходит: это ядро рендера WebGL (именованные импорты проверены — размер тот же). Порог — под него.
  vite: { build: { chunkSizeWarningLimit: 600 } },
  // i18n: базовый en на «/» без префикса; новые языки → добавить код в locales + роут /<code>/.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: { prefixDefaultLocale: false },
  },
});
