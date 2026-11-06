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

## Version 2 (alternative design) — `/v2/` "Island Index"
`src/v2/` + `src/pages/v2/`: a completely different, dark editorial / brutalist design (Roboto Flex condensed +
JetBrains Mono, square corners, hairlines, one electric Aegean blue). Same data, photos and languages as v1.
- Desktop: split screen — fixed left console (chapter index, live data, "Book a stay"), content on the right.
- Phones: full-screen story panels with progress bars on top and a booking dock at the bottom.
- Arrive: the photo lives inside the giant CORALI letters, then the camera flies through the "O" into the photo.
- Rooms as an index list; the room photo follows the cursor; each room opens full screen (drawer).
- Booking in two steps (dates & guests → live rooms & prices from `booking.hotelcorali.gr/api/public/availability`).
- "A day" horizontal film strip (pinned on desktop, swipe on phones), terminal-style concierge (PMS assistant widget).
- `noindex` + canonical to the classic page, excluded from the sitemap.

## Version 3 — `/v3/` "Aegean Summerhouse"
`src/v3/` + `src/pages/v3/`: the visual language of luxury boutique hotels (hōm Santorini, Mykonos No5, Armenaki):
- intro curtain (sun line drawing, first visit per session), minimal header (Menu · logo · Book) and full-screen menu with photo preview
- cinematic hero (photo slideshow with slow zoom), hotel film in a lightbox (YouTube, privacy-enhanced)
- floating booking "pill" → live prices panel (booking engine API), vertical "Book now" tab
- Paros colour-block mosaic, drag-to-scroll rooms with "Drag" cursor, experiences collage with the live meltemi tile,
  pinned horizontal gallery, guest-book quotes, location
- EB Garamond + Commissioner (Greek), GSAP ScrollTrigger + Lenis, off for reduced motion; noindex, not in the sitemap.
