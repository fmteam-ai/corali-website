// Corali v2 client: live prices, live strip, day/night theme, room filters, concierge. Motion loads on demand.
import { initDatePicker } from "../scripts/datepicker";

type Wind = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
type Data = {
  lang: string; intl: string; geo: { lat: number; lon: number }; book: string;
  winds: Record<Wind, string>;
  beaches: { name: string; km: number; sheltered: Wind[] }[];
  cal: { checkIn: string; checkOut: string; prev: string; next: string; close: string; nights: string; night: string };
  r: Record<string, string>;
  roomImgs: Record<string, string>;
};
type Plan = { key: string; name: string; totalCents: number; referenceCents?: number; standardCents?: number; cancellationDays?: number; refundPercent?: number; terms?: { payNowPercent?: number } | null };
type Room = { roomType: string; name: string; capacity?: number; availableCount?: number; images?: string[]; plans: Plan[] };

const D: Data = JSON.parse(document.getElementById("v2-data")!.textContent!);
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const root = document.documentElement;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };
const eur = (cents: number) => new Intl.NumberFormat(D.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

/* ───── Top bar becomes solid after the hero top ───── */
const top = $("[data-top]")!;
const onScroll = () => top.classList.toggle("is-solid", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
const langs = $<HTMLDetailsElement>(".langs");
document.addEventListener("click", (e) => { if (langs?.open && !langs.contains(e.target as Node)) langs.open = false; });

/* ───── Theme: auto (night after the Paros sunset) / day / night ───── */
const themeBtn = $<HTMLButtonElement>("[data-theme-btn]")!;
const themeLabel = $("[data-theme-label]")!;
const labels: Record<string, string> = { auto: themeBtn.querySelector(".theme-label")!.textContent!, day: "", night: "" };
let sun: { rise: number; set: number } | null = null;
function applyTheme() {
  const pref = root.dataset.themePref || "auto";
  let theme = pref;
  if (pref === "auto") {
    const now = Date.now();
    theme = sun ? (now >= sun.set || now < sun.rise ? "night" : "day") : root.dataset.theme || "day";
  }
  root.dataset.theme = theme;
  $('meta[name="theme-color"]')?.setAttribute("content", theme === "night" ? "#0d1615" : "#f3ede4");
  themeLabel.textContent = pref === "auto" ? labels.auto : labels[pref] || pref;
}
function themeWords(day: string, night: string) { labels.day = day; labels.night = night; }
themeBtn.addEventListener("click", () => {
  const order = ["auto", "day", "night"];
  const next = order[(order.indexOf(root.dataset.themePref || "auto") + 1) % 3];
  root.dataset.themePref = next;
  store.set("corali-theme", next);
  applyTheme();
});
setInterval(applyTheme, 60_000);

/* ───── Live strip ───── */
const clock = $("[data-clock]");
const timeFmt = new Intl.DateTimeFormat(D.intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" });
const tick = () => { if (clock) clock.textContent = timeFmt.format(new Date()); };
tick();
setInterval(tick, 20_000);
const order: Wind[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const toWind = (deg: number) => order[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const bft = (k: number) => { const i = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118].findIndex((x) => k < x); return i === -1 ? 12 : i; };
async function live() {
  const { lat, lon } = D.geo;
  try {
    const [w, m] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=Europe%2FAthens&forecast_days=1&timeformat=unixtime`).then((r) => r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature&timezone=Europe%2FAthens`).then((r) => r.json()).catch(() => null),
    ]);
    const rise = w.daily.sunrise[0] * 1000, set = w.daily.sunset[0] * 1000;
    sun = { rise, set };
    applyTheme();
    $("[data-sunset]")!.textContent = timeFmt.format(new Date(set));
    const dir = toWind(w.current.wind_direction_10m);
    const b = bft(w.current.wind_speed_10m);
    $("[data-wind]")!.textContent = `${D.winds[dir]} ${b} Bft`;
    const sea = m?.current?.sea_surface_temperature;
    $("[data-sea]")!.textContent = typeof sea === "number" ? `${Math.round(sea)}°C` : "—";
    const calm = D.beaches.filter((x) => x.sheltered.includes(dir)).sort((a, c) => a.km - c.km)[0];
    $("[data-calm]")!.textContent = calm ? calm.name : D.beaches[0].name;
  } catch {
    /* keep the dashes */
  }
}
const liveEl = $("[data-live]");
if (liveEl && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); live(); } }, { rootMargin: "300px" });
  io.observe(liveEl);
} else live();

/* ───── Booking bar → live prices on this page ───── */
const bar = $<HTMLFormElement>("[data-bar]")!;
const inEl = $<HTMLInputElement>("[data-in]", bar)!, outEl = $<HTMLInputElement>("[data-out]", bar)!;
const adultsEl = $<HTMLSelectElement>("[data-adults]", bar)!, childrenEl = $<HTMLSelectElement>("[data-children]", bar)!;
initDatePicker(bar, inEl, outEl, D.intl, D.cal, { up: true });
const results = $("[data-results]")!, list = $("[data-results-list]")!, rTitle = $("[data-results-title]")!, rOpen = $<HTMLAnchorElement>("[data-results-open]")!;
const fieldFmt = new Intl.DateTimeFormat(D.intl, { day: "numeric", month: "short", timeZone: "UTC" });
const pd = (s: string) => new Date(`${s}T12:00:00Z`);

function bookLink(content: string) {
  const u = new URL(D.book);
  u.search = new URLSearchParams({ lang: D.lang, checkIn: inEl.value, checkOut: outEl.value, adults: adultsEl.value, children: childrenEl.value, utm_source: "website", utm_medium: "referral", utm_content: content }).toString();
  return u.toString();
}
const roomId = (name: string) => { const n = name.toLowerCase(); return n.includes("penthouse") || n.includes("διαμέρ") ? "penthouse" : n.includes("deluxe") && n.includes("twin") ? "deluxeTwin" : n.includes("deluxe") ? "deluxeDouble" : n.includes("twin") ? "twin" : "double"; };

function renderRooms(rooms: Room[], nights: number) {
  if (!rooms.length) { list.innerHTML = `<p class="results-msg">${esc(D.r.none)}</p>`; return; }
  list.innerHTML = rooms.map((room) => {
    const img = D.roomImgs[roomId(room.name)] || room.images?.[0] || "";
    const meta = [room.capacity ? fill(D.r.cap, { n: room.capacity }) : "", room.availableCount && room.availableCount <= 2 ? `<span class="hot">${esc(fill(D.r.left, { n: room.availableCount }))}</span>` : ""].filter(Boolean);
    const plans = [...room.plans].sort((a, b) => b.totalCents - a.totalCents).map((p) => {
      const ref = Math.max(p.referenceCents || 0, p.standardCents || 0);
      const sub = (p.refundPercent ?? 100) === 0 ? D.r.nonref : p.cancellationDays ? fill(D.r.flex, { d: p.cancellationDays }) : "";
      const dep = p.terms?.payNowPercent && p.terms.payNowPercent < 100 ? fill(D.r.deposit, { p: p.terms.payNowPercent }) : "";
      return `<a class="plan" href="${esc(bookLink(`v2-plan-${p.key}`))}" rel="noopener">
        <span class="plan-name">${esc(p.name)}<small>${esc(sub)}</small>${dep ? `<small>${esc(dep)}</small>` : ""}</span>
        <span class="plan-price">${ref > p.totalCents ? `<s>${eur(ref)}</s>` : ""}${eur(p.totalCents)}<small>${esc(D.r.total)} · ${eur(p.totalCents / nights)} ${esc(D.r.night)}</small></span>
        <span class="plan-go">${esc(D.r.book)} →</span></a>`;
    }).join("");
    return `<article class="res">
      <div class="res-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="720" height="480">` : ""}</div>
      <div class="res-body"><h3>${esc(room.name)}</h3><p class="res-meta">${meta.map((x) => `<span>${x.startsWith("<") ? x : esc(x)}</span>`).join("")}</p><div class="plans">${plans}</div></div>
    </article>`;
  }).join("");
  window.dispatchEvent(new CustomEvent("v2:results"));
}

let seq = 0;
async function search() {
  const id = ++seq;
  const n = Math.round((pd(outEl.value).getTime() - pd(inEl.value).getTime()) / 864e5);
  const guests = Number(adultsEl.value) + Number(childrenEl.value);
  results.hidden = false;
  rTitle.textContent = fill(D.r.for, { in: fieldFmt.format(pd(inEl.value)), out: fieldFmt.format(pd(outEl.value)), n, g: guests });
  rOpen.href = bookLink("v2-results");
  list.innerHTML = `<p class="res-note">${esc(D.r.loading)}</p><div class="skel"></div><div class="skel"></div>`;
  results.scrollIntoView({ behavior: root.classList.contains("motion") ? "smooth" : "auto", block: "start" });
  try {
    const q = new URLSearchParams({ checkIn: inEl.value, checkOut: outEl.value, adults: adultsEl.value, children: childrenEl.value, rooms: "1", lang: D.lang });
    const res = await fetch(`${new URL(D.book).origin}/api/public/availability?${q}`, { headers: { Accept: "application/json" } });
    const j = await res.json();
    if (id !== seq) return;
    if (!j.ok) throw new Error(j.error);
    renderRooms(j.rooms as Room[], j.nights || n);
  } catch {
    if (id !== seq) return;
    list.innerHTML = `<p class="results-msg">${esc(D.r.error)}</p>`;
  }
}
bar.addEventListener("submit", (e) => { e.preventDefault(); search(); });

/* Buttons that lead to the price search: scroll to the bar and open the calendar. */
function openBar() {
  scrollTo({ top: 0, behavior: root.classList.contains("motion") ? "smooth" : "auto" });
  setTimeout(() => $<HTMLButtonElement>(".qb-date[data-cal=in]", bar)?.click(), 600);
}
$$("[data-check-prices], [data-open-bar]").forEach((a) => a.addEventListener("click", (e) => {
  if (!results.hidden && a.hasAttribute("data-open-bar")) return; // results already on screen: let the anchor scroll there
  e.preventDefault();
  openBar();
}));

/* ───── Room filters (Flip-animated when motion is on) ───── */
const grid = $("[data-room-grid]")!;
$$<HTMLButtonElement>("[data-filter]").forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.filter!;
  $$<HTMLButtonElement>("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  const apply = () => $$<HTMLElement>(".room", grid).forEach((r) => (r.hidden = k !== "all" && r.dataset.kind !== k));
  const f = (window as unknown as { __v2Flip?: (apply: () => void) => void }).__v2Flip;
  f ? f(apply) : apply();
}));

/* ───── Concierge: the PMS assistant widget, loaded on first use ───── */
let widget: Promise<ShadowRoot | null> | null = null;
function loadWidget() {
  if (widget) return widget;
  widget = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `${new URL(D.book).origin}/assistant-widget.js`;
    s.dataset.language = D.lang;
    s.dataset.color = getComputedStyle(root).getPropertyValue("--accent").trim() || "#c25a36";
    s.onload = () => {
      const host = document.querySelector<HTMLElement>("[data-corali-assistant]");
      const sr = host?.shadowRoot ?? null;
      if (sr) {
        // Our buttons open it; on phones the panel sits above the app bar.
        const st = document.createElement("style");
        st.textContent = ".btn{display:none!important}@media(max-width:959px){.panel{bottom:96px!important}}";
        sr.append(st);
      }
      resolve(sr);
    };
    s.onerror = () => resolve(null);
    document.body.append(s);
  });
  return widget;
}
$$("[data-ask]").forEach((b) => b.addEventListener("click", async () => {
  const sr = await loadWidget();
  const panel = sr?.querySelector(".panel");
  if (panel) { panel.classList.add("open"); sr!.querySelector<HTMLInputElement>("input")?.focus(); }
  else location.href = bookLink("v2-ask");
}));

/* ───── Motion ───── */
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
if (!reduce.matches) {
  import("./v2-motion").then((m) => m.init()).catch(() => root.classList.remove("motion"));
}

/* Day / night labels come from the language file via the button's aria-label siblings. */
themeWords(themeBtn.dataset.day || "", themeBtn.dataset.night || "");
applyTheme();
