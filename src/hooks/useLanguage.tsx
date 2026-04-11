import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import i18n, {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  type SupportedLanguage,
} from "@/lib/i18n";

interface LanguageContextType {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguage] = useState<SupportedLanguage>(readStoredLanguage);

  // On login: pull preferred_language from the user's Supabase profile.
  // If it differs from the current setting, apply it immediately.
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("preferred_language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const lang = data?.preferred_language;
        if (lang && isSupportedLanguage(lang) && lang !== i18n.language) {
          setLanguage(lang);
          localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
          void i18n.changeLanguage(lang);
        }
      });
  }, [user?.id]);

  // When the user changes language:
  // 1. Write to localStorage immediately (next page load will use it before Supabase loads)
  // 2. Apply to i18next (triggers re-render of all translated components)
  // 3. Persist to Supabase asynchronously (cross-device sync)
  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      setLanguage(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      await i18n.changeLanguage(lang);

      if (user?.id) {
        // Fire-and-forget: don't block the UI on a network round-trip
        void supabase
          .from("profiles")
          .update({ preferred_language: lang })
          .eq("user_id", user.id);
      }
    },
    [user?.id],
  );

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

