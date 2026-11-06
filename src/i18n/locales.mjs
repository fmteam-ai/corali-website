// Single source of truth for languages. To add a language: add it here, then run `npm run translate -- <code>`.
// `auto: true` = machine-translated from English by scripts/translate.mjs (review recommended).
export const defaultLocale = "en";
export const locales = [
  { code: "el", hreflang: "el-GR", ogLocale: "el_GR", label: "Ελληνικά", short: "EL", auto: false },
  { code: "en", hreflang: "en", ogLocale: "en_GB", label: "English", short: "EN", auto: false },
  { code: "de", hreflang: "de", ogLocale: "de_DE", label: "Deutsch", short: "DE", auto: true },
  { code: "fr", hreflang: "fr", ogLocale: "fr_FR", label: "Français", short: "FR", auto: true },
  { code: "it", hreflang: "it", ogLocale: "it_IT", label: "Italiano", short: "IT", auto: true },
];
