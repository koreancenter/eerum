import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  TRANSLATIONS,
  type AppLocale,
  type TranslationDictionary,
} from '../i18n/translations';

export type { AppLocale, TranslationDictionary };

export const LOCALE_STORAGE_KEY = 'eerum_locale';

function detectInitialLocale(): AppLocale {
  if (typeof window === 'undefined') return 'ko';
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'ko' || stored === 'en') {
      return stored;
    }
  } catch {
    // Ignore localStorage access errors
  }
  const browserLang =
    typeof navigator !== 'undefined' && typeof navigator.language === 'string'
      ? navigator.language
      : 'ko';
  return browserLang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function syncDocumentLang(locale: AppLocale): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale;
  }
}

let currentLocale: AppLocale = detectInitialLocale();
syncDocumentLang(currentLocale);

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppLocale {
  return currentLocale;
}

function getServerSnapshot(): AppLocale {
  return 'ko';
}

function emitLocaleChange(nextLocale: AppLocale, persist = true): void {
  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Ignore localStorage write errors
    }
  }
  if (currentLocale === nextLocale) {
    syncDocumentLang(nextLocale);
    return;
  }
  currentLocale = nextLocale;
  syncDocumentLang(nextLocale);
  listeners.forEach((listener) => listener());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) {
      const next = e.newValue === 'ko' || e.newValue === 'en' ? e.newValue : detectInitialLocale();
      emitLocaleChange(next, false);
    }
  });
}

export function getCurrentLocale(): AppLocale {
  return currentLocale;
}

export function getTranslations(locale: AppLocale = currentLocale): TranslationDictionary {
  return TRANSLATIONS[locale];
}

export function setAppLocale(nextLocale: AppLocale): void {
  emitLocaleChange(nextLocale, true);
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    emitLocaleChange(nextLocale, true);
  }, []);

  const toggleLocale = useCallback(() => {
    emitLocaleChange(currentLocale === 'ko' ? 'en' : 'ko', true);
  }, []);

  return {
    locale,
    setLocale,
    toggleLocale,
    t: TRANSLATIONS[locale],
    isEn: locale === 'en',
    isKo: locale === 'ko',
  };
}
