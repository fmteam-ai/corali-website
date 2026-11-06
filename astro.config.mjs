// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { locales, defaultLocale } from "./src/i18n/locales.mjs";

// BASE_PATH=/new26 builds a staging copy that lives in a sub-folder of the current site (noindex, no sitemap).
const base = process.env.BASE_PATH || "/";
const staging = base !== "/";

export default defineConfig({
  site: "https://www.hotelcorali.gr",
  base,
  trailingSlash: "always",
  build: { inlineStylesheets: "auto" },
  i18n: {
    locales: locales.map((l) => l.code),
    defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  integrations: staging ? [] : [
    sitemap({
      filter: (page) => !page.includes("/v2/") && !page.includes("/v3/"),
      i18n: {
        defaultLocale,
        locales: Object.fromEntries(locales.map((l) => [l.code, l.hreflang])),
      },
    }),
  ],
  image: { responsiveStyles: true },
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
