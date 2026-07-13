import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { type Lang, DEFAULT_LANG, detectLang, localePath as lp, switchPath } from "../lib/routes";

interface LocaleContextValue {
  lang: Lang;
  localePath: (sqPath: string) => string;
  switchLang: (targetLang: Lang) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  lang: DEFAULT_LANG,
  localePath: (p) => p,
  switchLang: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const lang = detectLang(location.pathname);

  // Sync i18n language with URL
  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  // Update <html lang="...">
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const localePathFn = (sqPath: string): string => lp(sqPath, lang);

  const switchLangFn = (targetLang: Lang) => {
    const newPath = switchPath(location.pathname, lang, targetLang);
    navigate(newPath + location.search);
  };

  return (
    <LocaleContext.Provider value={{ lang, localePath: localePathFn, switchLang: switchLangFn }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
