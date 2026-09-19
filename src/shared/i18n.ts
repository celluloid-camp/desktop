import { i18n } from "@lingui/core";
import { messages as en } from "@/locales/en/messages.po";
import { messages as fr } from "@/locales/fr/messages.po";

export const LOCALES = ["en", "fr"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

i18n.load({
  en,
  fr,
});

/** Map OS / browser locale tags to a supported app locale. */
export function resolveAppLocale(tag: string | undefined | null): AppLocale | null {
  if (!tag) return null;
  const normalized = tag.toLowerCase().replace("_", "-");
  if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  return null;
}

/** Prefer desktop language list; English fallback. */
export function detectDesktopLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const candidates = [...(navigator.languages ?? []), navigator.language];

  for (const tag of candidates) {
    const resolved = resolveAppLocale(tag);
    if (resolved) return resolved;
  }

  return DEFAULT_LOCALE;
}

export function activateLocale(locale: AppLocale = detectDesktopLocale()) {
  i18n.activate(locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  return locale;
}

export { i18n };
