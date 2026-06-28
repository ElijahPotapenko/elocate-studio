import { defineConfig } from 'astro/config';

// Elocate Studio — статический сайт-визитка. Деплой: Netlify (astro build → dist).
export default defineConfig({
  site: 'https://elocate.netlify.app',
  // i18n: базовый en на «/» без префикса; новые языки → добавить код в locales + роут /<code>/.
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: { prefixDefaultLocale: false },
  },
});
