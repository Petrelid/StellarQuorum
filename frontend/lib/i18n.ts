import english from "@/messages/en.json";

export const SUPPORTED_LOCALES = ["en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const catalogues: Record<Locale, unknown> = { en: english };

export function getLocale(candidate = process.env.NEXT_PUBLIC_LOCALE): Locale {
  return SUPPORTED_LOCALES.includes(candidate as Locale) ? candidate as Locale : DEFAULT_LOCALE;
}

export function t(key: string, values: Record<string, string | number> = {}, locale = getLocale()): string {
  const message = key.split(".").reduce<unknown>((value, part) =>
    value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined,
  catalogues[locale]);
  if (typeof message !== "string") throw new Error(`Missing ${locale} message: ${key}`);
  return message.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

export function formatNumber(value: number | bigint, options?: Intl.NumberFormatOptions, locale = getLocale()): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(value: Date | string | number, options: Intl.DateTimeFormatOptions = {}, locale = getLocale()): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale = getLocale()): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
}
