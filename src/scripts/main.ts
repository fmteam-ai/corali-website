// Everything here works with or without animation. Motion (GSAP + Lenis) is loaded on demand only when the device
// does not ask for reduced motion — so those users download none of it.
import { initDatePicker } from "./datepicker";

type Wind = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
type ClientData = {
  lang: string;
  winds: Record<Wind, string>;
  b: { wind: string; beaufort: string; sea: string; air: string; error: string; calm: string };
  geo: { lat: number; lon: number };
  locale: string;
  cal: { checkIn: string; checkOut: string; prev: string; next: string; close: string; nights: string; night: string };
  bookBase: string;
  alternates: Record<string, { href: string; text: { text: string; go: string; dismiss: string } }>;
};

const data: ClientData = JSON.parse(document.getElementById("corali-data")!.textContent!);
const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll<T>(s)];
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* Header: solid after scrolling, hides while scrolling down, comes back when scrolling up. */
const header = $("[data-header]")!;
let lastY = scrollY;
addEventListener("scroll", () => {
  const y = scrollY;
  header.classList.toggle("is-scrolled", y > 24);
  if (!document.body.classList.contains("menu-open")) header.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
  if (y < lastY - 4) header.classList.remove("is-hidden");
  lastY = y;
}, { passive: true });

/* Mobile menu */
const menuBtn = $<HTMLButtonElement>("[data-menu-btn]")!;
const menu = $("[data-mobile-menu]")!;
function setMenu(open: boolean) {
  menuBtn.setAttribute("aria-expanded", String(open));
  menu.hidden = !open;
  document.body.classList.toggle("menu-open", open);
  $("[data-open-label]", menuBtn)!.hidden = open;
  $("[data-close-label]", menuBtn)!.hidden = !open;
  window.dispatchEvent(new CustomEvent(open ? "corali:lock" : "corali:unlock"));
}
menuBtn.addEventListener("click", () => setMenu(menu.hidden));
addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
$$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* Language dropdown closes on outside click */
const langMenu = $<HTMLDetailsElement>("[data-lang-menu]");
document.addEventListener("click", (e) => { if (langMenu?.open && !langMenu.contains(e.target as Node)) langMenu.open = false; });

/* Quick booking: two-month calendar like the booking engine's (max 60 nights). */
const qForm = $<HTMLFormElement>("[data-quickbook]"), qIn = $<HTMLInputElement>("[data-in]"), qOut = $<HTMLInputElement>("[data-out]");
if (qForm && qIn && qOut) initDatePicker(qForm, qIn, qOut, data.locale, data.cal);

/* Sticky "Book" bar on phones: hidden while another booking button is on screen. */
const mobileBook = $("[data-mobile-book]");
if (mobileBook && "IntersectionObserver" in window) {
  const visible = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    mobileBook.classList.toggle("is-away", visible.size > 0);
  });
  $$(".hero-ctas, .quickbook, .cta, .footer").forEach((el) => io.observe(el));
}

/* ───── Meltemi guide: which beaches are sheltered from the wind ───── */
const order: Wind[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const toWind = (deg: number) => order[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const bftLimits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]; // km/h upper bound of Beaufort 0…11
const beaufort = (kmh: number) => { const i = bftLimits.findIndex((x) => kmh < x); return i === -1 ? 12 : i; };
const list = $("[data-beach-list]");
const arrow = $("[data-arrow]");
const windName = $("[data-wind-name]");

function showWind(w: Wind) {
  if (!list) return;
  const items = $$<HTMLLIElement>("li", list);
  items.forEach((li) => {
    const ok = li.dataset.sheltered!.split(" ").includes(w);
    li.classList.toggle("is-sheltered", ok);
    li.style.order = ok ? "0" : "1";
  });
  if (arrow) arrow.style.transform = `rotate(${order.indexOf(w) * 45}deg)`;
  if (windName) windName.textContent = data.winds[w];
  window.dispatchEvent(new CustomEvent("corali:beaches", { detail: items }));
}
$$<HTMLInputElement>('[data-compass] input[name="wind"]').forEach((r) => r.addEventListener("change", () => r.checked && showWind(r.value as Wind)));

async function liveWeather() {
  const out = $("[data-live-values]");
  if (!out) return;
  const { lat, lon } = data.geo;
  try {
    const [w, m] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=Europe%2FAthens`).then((r) => r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature&timezone=Europe%2FAthens`).then((r) => r.json()).catch(() => null),
    ]);
    const cur = w.current;
    const dir = toWind(cur.wind_direction_10m);
    const bft = beaufort(cur.wind_speed_10m);
    const sea = m?.current?.sea_surface_temperature;
    out.innerHTML = "";
    const cell = (big: string, small: string) => { const s = document.createElement("span"); s.innerHTML = `<b></b><small></small>`; s.querySelector("b")!.textContent = big; s.querySelector("small")!.textContent = small; out.append(s); };
    cell(`${data.winds[dir]} ${bft}`, `${data.b.wind} · ${data.b.beaufort}`);
    if (typeof sea === "number") cell(`${Math.round(sea)}°C`, data.b.sea);
    cell(`${Math.round(cur.temperature_2m)}°C`, data.b.air);
    if (bft <= 1) { const p = document.createElement("small"); p.style.flexBasis = "100%"; p.textContent = data.b.calm; out.append(p); }
    const radio = $<HTMLInputElement>(`[data-compass] input[value="${dir}"]`);
    if (radio) { radio.checked = true; showWind(dir); }
  } catch {
    out.textContent = data.b.error;
  }
}
// Load the weather only when the guide comes near the screen (keeps the first paint lean).
const beachesSection = $("[data-beaches]");
if (beachesSection && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); liveWeather(); } }, { rootMargin: "400px" });
  io.observe(beachesSection);
} else liveWeather();

/* ───── Suggest the visitor's own language (never auto-redirect: better for SEO and for choice) ───── */
(() => {
  if (store.get("corali-lang-dismissed")) return;
  const prefs = (navigator.languages ?? [navigator.language]).map((l) => l.slice(0, 2).toLowerCase());
  const match = prefs.find((p) => data.alternates[p]);
  if (!match || match === data.lang || prefs[0] !== match) return;
  const box = $("[data-suggest]")!;
  const alt = data.alternates[match];
  $("[data-suggest-text]", box)!.textContent = alt.text.text;
  $("[data-suggest-text]", box)!.setAttribute("lang", match);
  const go = $<HTMLAnchorElement>("[data-suggest-go]", box)!;
  go.textContent = alt.text.go;
  go.href = alt.href;
  go.hreflang = match;
  const no = $<HTMLButtonElement>("[data-suggest-dismiss]", box)!;
  no.textContent = alt.text.dismiss;
  no.addEventListener("click", () => { box.hidden = true; store.set("corali-lang-dismissed", "1"); });
  go.addEventListener("click", () => store.set("corali-lang-dismissed", "1"));
  setTimeout(() => (box.hidden = false), 1800);
})();

/* ───── Motion ───── */
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let started = false;
async function startMotion() {
  if (started || reduce.matches) return;
  started = true;
  try {
    const { initMotion } = await import("./motion");
    initMotion();
  } catch (err) {
    // If the animation code cannot load, show everything statically.
    document.documentElement.classList.remove("motion");
    console.warn("Motion disabled:", err);
  }
}
startMotion();
reduce.addEventListener?.("change", () => { if (!reduce.matches) { document.documentElement.classList.add("motion"); startMotion(); } });
