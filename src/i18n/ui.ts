/* ============================================================
   i18n — словарь UI-строк. Базовый язык = English (от него переводим остальные).
   Добавить язык: 1) скопировать блок `en` под новый код (`de`, `es`…),
   2) перевести значения, 3) добавить код в `languages` + в astro.config `i18n.locales`,
   4) создать роут `src/pages/<code>/index.astro` (рендерит тот же <Home/>).

   Строки с пометкой [html] содержат разметку (акцент-span/перенос) и рендерятся через set:html —
   так порядок слов и выделение свободно меняются под каждый язык.
   ============================================================ */

export const languages = {
  en: 'English',
} as const;

export const defaultLang = 'en';

export type Lang = keyof typeof languages;

export const ui = {
  en: {
    // — header / nav —
    'nav.work': 'Work',
    'nav.lab': 'Lab',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.cta': 'Let’s talk',
    'brand.suffix': '.studio',

    // — hero —
    'hero.eyebrow': 'Design studio',
    'hero.title': 'Design collaboration<br />across <span class="accent">disciplines</span>', // [html]
    'hero.lead':
      'Elocate is a small studio that brings product, interface, and brand into one coherent system. We think in strategy and ship in the details.',
    'hero.cta.primary': 'Let’s talk',
    'hero.cta.secondary': 'View work',

    // — work —
    'work.eyebrow': 'Selected work',
    'work.heading': 'Projects where disciplines<br />work as one team', // [html]
    'work.02.title': 'Finance Dashboard',
    'work.02.desc':
      'A colorful dashboard for managing expenses — branded widgets, insights, and a clear hierarchy.',
    'work.03.title': 'Design in Motion',
    'work.03.desc':
      'A kinetic 3D wordmark — chrome, depth, and rhythm; typography that moves and still reads clean.',
    'work.04.title': 'Travel to Asia',
    'work.04.desc':
      'A playful 3D travel story — bold scenes, warm palette, and motion that carries the journey.',
    'work.05.title': 'The Assistant That Says No',
    'work.05.desc':
      'A scroll-told case study for a multilingual clinic assistant — the guardrails, the refused prompt injection, the paper trail, and four real recorded conversations you can replay live.',
    'work.06.title': 'Analytics Pulse',
    'work.06.desc':
      'A product-analytics dashboard for a SaaS team — count-up metrics, a self-drawing revenue chart with live tooltips, and channel breakdowns that feel alive, not archived.',
    'work.07.title': 'Nova — Pop-Art Copilot',
    'work.07.desc':
      'A speculative brand concept pushed to the edge: Memphis confetti, sticker UI with hard offset shadows, a candy-glass 3D hero, and bouncy magnetic everything — the site as a piece of art.',

    // — about —
    'about.eyebrow': 'About the studio',
    'about.heading':
      'We’re a design collective working across disciplines: product, interface, and brand live in <span class="accent">one system</span> — not in scattered corners.', // [html]
    'about.text':
      'Elocate assembles cross-disciplinary teams around the task. We love meaningful interfaces, honest typography, and systems that survive a redesign. Less noise — more substance.',
    'about.caps.title': 'Capabilities',
    'about.cap.1': 'Product design',
    'about.cap.2': 'UI/UX systems',
    'about.cap.3': 'Brand identity',
    'about.cap.4': 'Design tokens',
    'about.cap.5': 'Motion & prototyping',
    'about.cap.6': 'Frontend handoff',
    'about.stat.1.v': '8+',
    'about.stat.1.l': 'years in design',
    'about.stat.2.v': '40+',
    'about.stat.2.l': 'projects',
    'about.stat.3.v': '∞',
    'about.stat.3.l': 'iterations until “that’s it”',

    // — contact —
    'contact.eyebrow': 'Let’s connect',
    'contact.heading': 'Got a project at the intersection<br />of product and brand?', // [html]
    'contact.text.pre': 'Tell us in a line or two — we’ll reply within a couple of days. Or write directly at ',
    'contact.email': 'elocate.design@gmail.com',
    'contact.status': 'Currently open to new projects',
    'contact.meta.1.k': 'Response',
    'contact.meta.1.v': 'within ~2 days',
    'contact.meta.2.k': 'Working',
    'contact.meta.2.v': 'remote · worldwide',
    'contact.form.name': 'Name',
    'contact.form.name.ph': 'What’s your name',
    'contact.form.email': 'Email',
    'contact.form.email.ph': 'you@studio.com',
    'contact.form.message': 'Message',
    'contact.form.message.ph': 'A few words about the project',
    'contact.form.submit': 'Send message',

    // — footer —
    'footer.github': 'GitHub',
    'footer.email': 'Email',
    'footer.privacy': 'Privacy',
    'footer.top': 'Back to top ↑',
    'footer.copy': 'Elocate — Design collaboration across disciplines.',
  },
} as const;
