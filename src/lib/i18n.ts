import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

export const SUPPORTED_LANGUAGES = ["en", "it", "de", "fr", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

// Human-readable language name for AI prompts (e.g. "Italian", "German")
export const LANGUAGE_NAMES_FOR_AI: Record<SupportedLanguage, string> = {
  en: "English",
  it: "Italian",
  de: "German",
  fr: "French",
  es: "Spanish",
};

export const LANGUAGE_STORAGE_KEY = "cc_language";

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

// Read initial language from localStorage before i18next initializes to avoid flash
function getInitialLanguage(): string {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
    // localStorage unavailable (SSR / private browsing edge case)
  }
  return DEFAULT_LANGUAGE;
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    defaultNS: "common",
    ns: ["common", "nav", "auth", "dashboard", "insights", "inbox", "settings", "errors"],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
    react: {
      useSuspense: true,
    },
    // Never log missing keys in production
    missingKeyHandler: import.meta.env.DEV
      ? (lngs, ns, key) => console.warn(`[i18n] missing key: ${ns}:${key} (${lngs.join(",")})`)
      : false,
  });

export default i18n;
