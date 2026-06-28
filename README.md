# Elocate Studio

> Design collaboration across disciplines — сайт-визитка дизайн-студии.

🌐 **Прод:** https://elocate.netlify.app/

Полный редизайн с нуля на **Astro** (2026-06): тёмная/светлая темы с переключалкой,
3D-сфера в hero, видео-кейсы, бенто-раскладка, i18n.

## Стек
- **[Astro 5](https://astro.build)** — статический генератор, без UI-фреймворка
- Ваниль JS-модули для эффектов (`src/scripts/`), CSS-токены (`src/styles/global.css`)
- **Netlify** — хостинг + авто-деплой при push в `main`; форма на Netlify Forms

## Команды
```bash
npm install             # зависимости
npm run dev             # дев-сервер → http://localhost:4321
npm run dev -- --host   # + доступ по сети (тест с телефона)
npm run build           # прод-сборка → dist/
npm run preview         # предпросмотр сборки
```

## Структура
```
src/
  layouts/Layout.astro     # база: мета, темы, оркестрация скриптов
  pages/index.astro        # композит страницы
  components/               # Header · Hero · Work · About · Contact · Footer
  scripts/                  # sphere · cursor · reveal · tilt (ES-модули)
  styles/global.css         # дизайн-токены (источник истины) + светлая тема
  i18n/                     # словарь ui.ts + хелпер utils.ts (англ база)
public/assets/              # лого, картинки, видео-кейсы (mp4)
legacy/                     # прежний статический сайт (референс)
```

## Темы
Тёмная по умолчанию; светлая — через `:root[data-theme='light']` (переопределяет только
палитру). Переключалка в шапке хранит выбор в `localStorage`, тема ставится инлайн-скриптом
до отрисовки (без вспышки). Новый цвет/тема = правка токенов, без обхода компонентов.

## i18n
Англ — базовый язык. Добавить язык: блок словаря в `src/i18n/ui.ts` + locale в
`astro.config.mjs` + роут `src/pages/<код>/index.astro`.

## Деплой
Push в `main` → Netlify собирает (`npm run build`, publish `dist/`) и публикует автоматически.

---
*Один проект — одна репа — один деплой.*
