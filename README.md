# Hotel Corali — website (www.hotelcorali.gr)

Static, mobile-first, multilingual website for Hotel Corali, Piso Livadi, Paros.

**Stack:** Astro 5 (static HTML, zero JS by default) · TypeScript · GSAP 3 + ScrollTrigger · Lenis · Astro Image (AVIF/WebP) · self-hosted variable fonts (Noto Serif Display + Manrope, Greek subsets) · @astrojs/sitemap.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # → dist/ (upload anywhere: cPanel, Netlify, Cloudflare Pages, Vercel)
```

## Languages
- `src/i18n/en.json` (default, `/`) and `el.json` (`/el/`) are written by hand — same URL layout as the old WordPress site.
- `de`, `fr`, `it` are auto-translated from English (`auto: true` in `src/i18n/locales.mjs`; the page says so in the footer).
- New language: add it to `src/i18n/locales.mjs`, then `DEEPL_API_KEY=… npm run translate -- es` → creates `src/i18n/es.json`, a page at `/es/`, hreflang and a sitemap entry.
- Re-running `npm run translate` only re-translates strings whose English text changed, so hand fixes survive.
- Missing keys fall back to English. Visitors whose browser language differs get a small "switch language" suggestion (never an automatic redirect).

## Booking
All "Book" buttons go to `https://booking.hotelcorali.gr/book?lang=…&utm_source=website&utm_medium=referral&utm_content=<button>`.
The date form passes `checkIn` / `checkOut` straight to the booking engine. Change it in `src/data/hotel.ts` (`bookUrl`).

## Motion & accessibility
- `src/scripts/motion.ts` (GSAP + ScrollTrigger + Lenis) is loaded **only** when `prefers-reduced-motion` is not `reduce`; otherwise none of it is downloaded and the page is fully static with native scrolling.
- Everything runs inside `gsap.matchMedia()`, so turning on "reduce motion" while the page is open reverts all animations and destroys Lenis.
- Content is visible without JavaScript (the `motion` class that hides reveal states is only added when motion is allowed).
- GSAP skills for Claude are in `.claude/skills/gsap-*` (copied from fmteam-ai/corali-pms).

## SEO
Per-language `<title>`/description, canonical, hreflang (+ x-default → English), Open Graph/Twitter, schema.org `Hotel` JSON-LD (address, geo, ReserveAction), sitemap with alternates, robots.txt, semantic headings, preloaded AVIF hero (LCP), self-hosted fonts.

## Content source
Hotel facts, rooms (amenities, floor, "from" prices), photos, reviews and location info come from the current
www.hotelcorali.gr (November 2026): `src/data/hotel.ts`, `src/data/rooms.ts`, `src/data/reviews.ts`, `src/assets/`.
Update the "from" prices in `src/data/rooms.ts` when the price list changes.
