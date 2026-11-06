// Corali v2 "Island Index" client: live console, chapter index, room drawer, two-step booking sheet with live
// prices from the booking engine, cursor, rotating reviews, concierge. Motion (GSAP + Lenis) loads on demand.
import { initDatePicker } from "../scripts/datepicker";

type Wind = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
type Data = {
  lang: string; intl: string; geo: { lat: number; lon: number }; book: string; winds: Record<Wind, string>;
  beaches: { name: string; km: number; sheltered: Wind[] }[];
  cal: { checkIn: string; checkOut: string; prev: string; next: string; close: string; nights: string; night: string };
  r: Record<string, string>; roomImgs: Record<string, string>;
};
type Plan = { key: string; name: string; totalCents: number; referenceCents?: number; standardCents?: number; cancellationDays?: number; refundPercent?: number; terms?: { payNowPercent?: number } | null };
type Room = { name: string; capacity?: number; availableCount?: number; images?: string[]; plans: Plan[] };

const D: Data = JSON.parse(document.getElementById("v2-data")!.textContent!);
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const root = document.documentElement;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const eur = (c: number) => new Intl.NumberFormat(D.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);
const motionOK = () => root.classList.contains("motion");

/* ───── Live console ───── */
const timeFmt = new Intl.DateTimeFormat(D.intl, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Athens" });
const clock = $("[data-clock]");
const tick = () => { if (clock) clock.textContent = timeFmt.format(new Date()); };
tick();
setInterval(tick, 20_000);
const order: Wind[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const toWind = (deg: number) => order[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const bft = (k: number) => { const i = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118].findIndex((x) => k < x); return i === -1 ? 12 : i; };
(async () => {
  const { lat, lon } = D.geo;
  try {
    const [w, m] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&daily=sunset&timezone=Europe%2FAthens&forecast_days=1&timeformat=unixtime`).then((r) => r.json()),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature&timezone=Europe%2FAthens`).then((r) => r.json()).catch(() => null),
    ]);
    $("[data-sunset]")!.textContent = timeFmt.format(new Date(w.daily.sunset[0] * 1000));
    const dir = toWind(w.current.wind_direction_10m);
    $("[data-wind]")!.textContent = `${D.winds[dir]} ${bft(w.current.wind_speed_10m)} Bft`;
    const sea = m?.current?.sea_surface_temperature;
    if (typeof sea === "number") $("[data-sea]")!.textContent = `${Math.round(sea)}°C`;
    const calm = D.beaches.filter((b) => b.sheltered.includes(dir)).sort((a, b) => a.km - b.km)[0];
    $("[data-calm]")!.textContent = (calm ?? D.beaches[0]).name;
  } catch { /* keep the dashes */ }
})();

/* ───── Chapter index + story progress ───── */
const panels = $$<HTMLElement>("[data-chapter-panel]");
const links = $$<HTMLAnchorElement>("[data-chapter]");
const bars = $$<HTMLElement>(".story-bar b");
function progress() {
  const mid = innerHeight * 0.4;
  let active = 0;
  panels.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    if (r.top <= mid) active = i;
    const prog = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
    bars[i]?.style.setProperty("--p", String(prog));
  });
  links.forEach((a, i) => a.classList.toggle("is-on", i === active));
}
addEventListener("scroll", progress, { passive: true });
addEventListener("resize", progress);
progress();

/* ───── Dialogs ───── */
const drawer = $<HTMLDialogElement>("[data-drawer]")!;
const sheet = $<HTMLDialogElement>("[data-sheet]")!;
const lockScroll = (on: boolean) => window.dispatchEvent(new CustomEvent(on ? "v2:lock" : "v2:unlock"));
function openDialog(dlg: HTMLDialogElement) { if (!dlg.open) { dlg.showModal(); lockScroll(true); } }
function closeDialog(dlg: HTMLDialogElement) { if (dlg.open) dlg.close(); }
[drawer, sheet].forEach((dlg) => {
  dlg.addEventListener("close", () => { if (!drawer.open && !sheet.open) lockScroll(false); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); }); // backdrop click
  $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", () => closeDialog(dlg)));
});
$$("[data-room]").forEach((b) => b.addEventListener("click", () => {
  const id = (b as HTMLElement).dataset.room!;
  $$<HTMLElement>("[data-dr]", drawer).forEach((a) => (a.hidden = a.dataset.dr !== id));
  openDialog(drawer);
  drawer.scrollTop = 0;
}));
$$("[data-open-sheet]").forEach((b) => b.addEventListener("click", () => {
  closeDialog(drawer);
  showStep(1);
  openDialog(sheet);
}));

/* ───── Booking sheet: step 1 (dates, guests) → step 2 (live rooms & prices) ───── */
const form = $<HTMLFormElement>("[data-bar]", sheet)!;
const inEl = $<HTMLInputElement>("[data-in]", form)!, outEl = $<HTMLInputElement>("[data-out]", form)!;
const adultsEl = $<HTMLSelectElement>("[data-adults]", form)!, childrenEl = $<HTMLSelectElement>("[data-children]", form)!;
initDatePicker(form, inEl, outEl, D.intl, D.cal);
const resultsEl = $("[data-results]", sheet)!, list = $("[data-results-list]", sheet)!, rTitle = $("[data-results-title]", sheet)!, rOpen = $<HTMLAnchorElement>("[data-results-open]", sheet)!;
const stepNo = $("[data-step-no]", sheet)!, stepName = $("[data-step-name]", sheet)!;
const stepNames = [stepName.textContent!, ($("[data-results]", sheet)!.closest("dialog")!.dataset.step2 || "")];
function showStep(n: 1 | 2) {
  form.hidden = n === 2;
  resultsEl.hidden = n === 1;
  stepNo.textContent = `0${n}`;
  stepName.textContent = n === 1 ? stepNames[0] : stepNames[1] || stepNames[0];
  sheet.scrollTop = 0;
}
$("[data-back]", sheet)!.addEventListener("click", () => showStep(1));

const fieldFmt = new Intl.DateTimeFormat(D.intl, { day: "numeric", month: "short", timeZone: "UTC" });
const pd = (s: string) => new Date(`${s}T12:00:00Z`);
function bookLink(content: string) {
  const u = new URL(D.book);
  u.search = new URLSearchParams({ lang: D.lang, checkIn: inEl.value, checkOut: outEl.value, adults: adultsEl.value, children: childrenEl.value, utm_source: "website", utm_medium: "referral", utm_content: content }).toString();
  return u.toString();
}
const roomId = (name: string) => { const n = name.toLowerCase(); return n.includes("penthouse") || n.includes("διαμέρ") ? "penthouse" : n.includes("deluxe") && n.includes("twin") ? "deluxeTwin" : n.includes("deluxe") ? "deluxeDouble" : n.includes("twin") ? "twin" : "double"; };

function render(rooms: Room[], nights: number) {
  if (!rooms.length) { list.innerHTML = `<p class="results-msg">${esc(D.r.none)}</p>`; return; }
  list.innerHTML = rooms.map((room) => {
    const img = D.roomImgs[roomId(room.name)] || room.images?.[0] || "";
    const meta: string[] = [];
    if (room.capacity) meta.push(esc(fill(D.r.cap, { n: room.capacity })));
    if (room.availableCount && room.availableCount <= 2) meta.push(`<span class="hot">${esc(fill(D.r.left, { n: room.availableCount }))}</span>`);
    const plans = [...room.plans].sort((a, b) => b.totalCents - a.totalCents).map((p) => {
      const ref = Math.max(p.referenceCents || 0, p.standardCents || 0);
      const sub = (p.refundPercent ?? 100) === 0 ? D.r.nonref : p.cancellationDays ? fill(D.r.flex, { d: p.cancellationDays }) : "";
      const dep = p.terms?.payNowPercent && p.terms.payNowPercent < 100 ? fill(D.r.deposit, { p: p.terms.payNowPercent }) : "";
      return `<a class="plan" href="${esc(bookLink(`v2-plan-${p.key}`))}" rel="noopener"><span class="plan-name">${esc(p.name)}<small>${esc(sub)}</small>${dep ? `<small>${esc(dep)}</small>` : ""}</span><span class="plan-price">${ref > p.totalCents ? `<s>${eur(ref)}</s>` : ""}${eur(p.totalCents)}<small>${esc(D.r.total)} · ${eur(p.totalCents / nights)} ${esc(D.r.night)}</small></span><span class="plan-go">${esc(D.r.book)} →</span></a>`;
    }).join("");
    return `<article class="res"><div class="res-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="900" height="600">` : ""}</div><div class="res-body"><h3>${esc(room.name)}</h3><p class="res-meta">${meta.map((x) => `<span>${x}</span>`).join("")}</p><div class="plans">${plans}</div></div></article>`;
  }).join("");
  window.dispatchEvent(new CustomEvent("v2:results"));
}
let seq = 0;
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = ++seq;
  const n = Math.round((pd(outEl.value).getTime() - pd(inEl.value).getTime()) / 864e5);
  rTitle.textContent = fill(D.r.for, { in: fieldFmt.format(pd(inEl.value)), out: fieldFmt.format(pd(outEl.value)), n, g: Number(adultsEl.value) + Number(childrenEl.value) });
  rOpen.href = bookLink("v2-results");
  list.innerHTML = `<p class="res-note">${esc(D.r.loading)}</p><div class="skel"></div><div class="skel"></div>`;
  showStep(2);
  try {
    const q = new URLSearchParams({ checkIn: inEl.value, checkOut: outEl.value, adults: adultsEl.value, children: childrenEl.value, rooms: "1", lang: D.lang });
    const j = await (await fetch(`${new URL(D.book).origin}/api/public/availability?${q}`, { headers: { Accept: "application/json" } })).json();
    if (id !== seq) return;
    if (!j.ok) throw new Error(j.error);
    render(j.rooms as Room[], j.nights || n);
  } catch {
    if (id === seq) list.innerHTML = `<p class="results-msg">${esc(D.r.error)}</p>`;
  }
});

/* ───── Rotating reviews ───── */
const qs = $$<HTMLElement>("[data-q]");
let qi = 0;
if (qs.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  setInterval(() => { if (document.hidden) return; qs[qi].classList.remove("is-on"); qi = (qi + 1) % qs.length; qs[qi].classList.add("is-on"); }, 5200);
}

/* ───── Concierge: PMS assistant widget, loaded on first use ───── */
let widget: Promise<ShadowRoot | null> | null = null;
function loadWidget() {
  return (widget ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `${new URL(D.book).origin}/assistant-widget.js`;
    s.dataset.language = D.lang;
    s.dataset.color = "#2a46ff";
    s.onload = () => {
      const sr = document.querySelector<HTMLElement>("[data-corali-assistant]")?.shadowRoot ?? null;
      if (sr) { const st = document.createElement("style"); st.textContent = ".btn{display:none!important}@media(max-width:959px){.panel{bottom:76px!important}}"; sr.append(st); }
      resolve(sr);
    };
    s.onerror = () => resolve(null);
    document.body.append(s);
  }));
}
$$("[data-ask]").forEach((b) => b.addEventListener("click", async () => {
  const sr = await loadWidget();
  const panel = sr?.querySelector(".panel");
  if (panel) { panel.classList.toggle("open"); sr!.querySelector<HTMLInputElement>("input")?.focus(); }
  else location.href = bookLink("v2-ask");
}));

/* ───── Language menu ───── */
const lang = $<HTMLDetailsElement>(".c-lang");
document.addEventListener("click", (e) => { if (lang?.open && !lang.contains(e.target as Node)) lang.open = false; });

/* ───── Motion ───── */
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  import("./v2-motion").then((m) => m.init()).catch(() => root.classList.remove("motion"));
}
void motionOK;
