/* i18n-хелперы. useTranslations(lang) → t(key) с фолбэком на базовый язык. */
import { ui, defaultLang, type Lang } from './ui';

export function useTranslations(lang: Lang) {
  return function t(key: string): string {
    return (
      (ui[lang] as Record<string, string>)[key] ??
      (ui[defaultLang] as Record<string, string>)[key] ??
      key
    );
  };
}

/** Текущий язык из Astro.currentLocale с безопасным фолбэком. */
export function resolveLang(locale: string | undefined): Lang {
  return (locale && locale in ui ? locale : defaultLang) as Lang;
}
