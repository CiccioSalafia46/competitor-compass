/**
 * i18n system tests
 *
 * These tests verify:
 *   1. Default language is English
 *   2. isSupportedLanguage correctly guards allowed values
 *   3. LANGUAGE_NAMES covers all supported languages
 *   4. LANGUAGE_NAMES_FOR_AI covers all supported languages
 *   5. localStorage key constant is stable
 *   6. All 5 supported languages are present
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_NAMES,
  LANGUAGE_NAMES_FOR_AI,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
} from "./i18n";

describe("i18n constants", () => {
  it("has English as the default language", () => {
    expect(DEFAULT_LANGUAGE).toBe("en");
  });

  it("supports exactly 5 languages: en, it, de, fr, es", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
    expect(SUPPORTED_LANGUAGES).toContain("en");
    expect(SUPPORTED_LANGUAGES).toContain("it");
    expect(SUPPORTED_LANGUAGES).toContain("de");
    expect(SUPPORTED_LANGUAGES).toContain("fr");
    expect(SUPPORTED_LANGUAGES).toContain("es");
  });

  it("has a display name for every supported language", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NAMES[lang]).toBeTruthy();
    }
  });

  it("has an AI prompt name for every supported language", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_NAMES_FOR_AI[lang]).toBeTruthy();
    }
  });

  it("AI language names are English words (for OpenAI prompt injection)", () => {
    expect(LANGUAGE_NAMES_FOR_AI.en).toBe("English");
    expect(LANGUAGE_NAMES_FOR_AI.it).toBe("Italian");
    expect(LANGUAGE_NAMES_FOR_AI.de).toBe("German");
    expect(LANGUAGE_NAMES_FOR_AI.fr).toBe("French");
    expect(LANGUAGE_NAMES_FOR_AI.es).toBe("Spanish");
  });

  it("uses a stable localStorage key", () => {
    expect(LANGUAGE_STORAGE_KEY).toBe("cc_language");
  });
});

describe("isSupportedLanguage", () => {
  it("accepts all valid language codes", () => {
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("it")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(true);
    expect(isSupportedLanguage("es")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isSupportedLanguage("zh")).toBe(false);
    expect(isSupportedLanguage("EN")).toBe(false);
    expect(isSupportedLanguage("")).toBe(false);
    expect(isSupportedLanguage("english")).toBe(false);
    expect(isSupportedLanguage("pt")).toBe(false);
  });
});

describe("localStorage language persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads back what was stored", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "it");
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    expect(stored).toBe("it");
    expect(isSupportedLanguage(stored ?? "")).toBe(true);
  });

  it("defaults to 'en' when localStorage is empty", () => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = stored && isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    expect(lang).toBe("en");
  });

  it("defaults to 'en' when localStorage has an unsupported code", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh");
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = stored && isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
    expect(lang).toBe("en");
  });

  it("accepts all 5 supported languages from localStorage", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const resolved = stored && isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
      expect(resolved).toBe(lang);
    }
  });
});

describe("translation file key consistency", () => {
  // Ensures the mapping objects have consistent entries across languages
  it("LANGUAGE_NAMES and LANGUAGE_NAMES_FOR_AI have the same keys", () => {
    const displayKeys = Object.keys(LANGUAGE_NAMES).sort();
    const aiKeys = Object.keys(LANGUAGE_NAMES_FOR_AI).sort();
    expect(displayKeys).toEqual(aiKeys);
  });

  it("all LANGUAGE_NAMES keys are supported languages", () => {
    for (const key of Object.keys(LANGUAGE_NAMES)) {
      expect(isSupportedLanguage(key)).toBe(true);
    }
  });
});
