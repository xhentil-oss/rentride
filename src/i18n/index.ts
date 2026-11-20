import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { LANGS, detectLang, type Lang } from '../lib/routes';

// Albanian is the default and the fallback for every missing key, so it ships
// in the main bundle. Every other language is a separate chunk fetched only
// when a visitor actually uses it — 8 extra languages × ~50 KB would otherwise
// be downloaded by everyone.
import sq from './locales/sq.json';

const LOADERS: Record<Exclude<Lang, 'sq'>, () => Promise<{ default: object }>> = {
  en: () => import('./locales/en.json'),
  fr: () => import('./locales/fr.json'),
  es: () => import('./locales/es.json'),
  it: () => import('./locales/it.json'),
  de: () => import('./locales/de.json'),
  pl: () => import('./locales/pl.json'),
  cs: () => import('./locales/cs.json'),
  he: () => import('./locales/he.json'),
};

/** Make sure a language's strings are loaded. Resolves immediately if already present. */
export async function loadLanguage(lng: string): Promise<void> {
  if (lng === 'sq' || i18n.hasResourceBundle(lng, 'translation')) return;
  const load = LOADERS[lng as Exclude<Lang, 'sq'>];
  if (!load) return;
  const mod = await load();
  i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      sq: { translation: sq },
    },
    // The URL decides the language (see useLocale); start from it so the first
    // render is already in the right language once its bundle is loaded.
    lng: typeof window !== 'undefined' ? detectLang(window.location.pathname) : 'sq',
    partialBundledLanguages: true,
    fallbackLng: 'sq',
    supportedLngs: [...LANGS],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'rct_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
