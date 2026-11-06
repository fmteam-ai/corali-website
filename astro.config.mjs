// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { locales, defaultLocale } from "./src/i18n/locales.mjs";

export default defineConfig({
  site: "https://www.hotelcorali.gr",
  trailingSlash: "always",
  build: { inlineStylesheets: "auto" },
  i18n: {
    locales: locales.map((l) => l.code),
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((l) => [l.code, l.hreflang])),
      },
    }),
  ],
  image: { responsiveStyles: true },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
