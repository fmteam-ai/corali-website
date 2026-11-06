import { locales, defaultLocale } from "./locales.mjs";
import en from "./en.json";

export type Dict = typeof en;
export type Lang = string;
export { locales, defaultLocale };

const files = import.meta.glob<{ default: Partial<Dict> }>("./*.json", { eager: true });

/** Deep merge so a missing key in a translated file falls back to English. */
function merge<T>(base: T, over: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(over) && over.length === base.length ? base.map((b, i) => merge(b, over[i])) : base) as T;
  if (base && typeof base === "object") {
    const o = (over ?? {}) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, merge(v, o[k])])) as T;
  }
  return (typeof over === typeof base ? over : base) as T;
}

export function t(lang: Lang): Dict {
  return merge(en, files[`./${lang}.json`]?.default);
}

export const localeOf = (code: Lang) => locales.find((l) => l.code === code)!;
/** Site base ("/" live, "/new26/" for the staging copy), always with a trailing slash. */
export const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
/** A staging build (in a sub-folder) must not be indexed next to the live site. */
export const staging = base !== "/";
/** URL of the home page in a language: "/" for Greek, "/en/" etc. (prefixed with the base). */
export const homePath = (code: Lang) => (code === defaultLocale ? base : `${base}${code}/`);
/** Path of a file in public/, with the base. */
export const asset = (file: string) => `${base}${file}`;

/** Home page of the alternative design (v2): /v2/, /v2/el/ … */
export const v2Path = (code: Lang) => (code === defaultLocale ? `${base}v2/` : `${base}v2/${code}/`);
