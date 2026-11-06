// Corali v3 client: header, full-screen menu, cinematic slideshow, booking pill → live prices panel,
// drag-to-scroll rooms, rotating reviews, live meltemi tile, film lightbox. Motion (GSAP + Lenis) on demand.
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

const D: Data = JSON.parse(document.getElementById("v3-data")!.textContent!);
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const eur = (c: number) => new Intl.NumberFormat(D.intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);
const lock = (on: boolean) => window.dispatchEvent(new CustomEvent(on ? "v3:lock" : "v3:unlock"));

/* ───── Header: transparent over the hero, solid after; hides on scroll down ───── */
const hd = $("[data-hd]")!;
let lastY = scrollY;
const onScroll = () => {
  const y = scrollY;
  hd.classList.toggle("is-solid", y > innerHeight * 0.6);
  hd.classList.toggle("is-up", y > innerHeight && y > lastY + 4);
  if (y < lastY - 4) hd.classList.remove("is-up");
  lastY = y;
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();
const langD = $<HTMLDetailsElement>(".hd-lang");
document.addEventListener("click", (e) => { if (langD?.open && !langD.contains(e.target as Node)) langD.open = false; });

/* ───── Full-screen menu with image preview ───── */
const menu = $("[data-menu]")!, menuBtn = $<HTMLButtonElement>("[data-menu-open]")!, menuImg = $<HTMLImageElement>("[data-menu-img]")!;
function setMenu(open: boolean) {
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
  lock(open);
  if (open) $<HTMLElement>("[data-menu-close]")!.focus();
  window.dispatchEvent(new CustomEvent("v3:menu", { detail: open }));
}
menuBtn.addEventListener("click", () => setMenu(true));
$("[data-menu-close]")!.addEventListener("click", () => { setMenu(false); menuBtn.focus(); });
$$<HTMLAnchorElement>("[data-menu-link]").forEach((a) => {
  a.addEventListener("pointerenter", () => { if (menuImg.src !== new URL(a.dataset.img!, location.href).href) { menuImg.style.opacity = "0"; setTimeout(() => { menuImg.src = a.dataset.img!; menuImg.style.opacity = "1"; }, 180); } });
  a.addEventListener("click", () => setMenu(false));
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); } });

/* ───── Hero slideshow ───── */
const slides = $$("[data-slide]"), dots = $$("[data-dot]");
let si = 0;
if (slides.length > 1 && !reduce.matches) {
  setInterval(() => {
    if (document.hidden || scrollY > innerHeight) return;
    slides[si].classList.remove("is-on"); dots[si].classList.remove("is-on");
    si = (si + 1) % slides.length;
    slides[si].classList.add("is-on"); dots[si].classList.add("is-on");
  }, 6500);
}

/* ───── Booking pill (hero) + live prices panel ───── */
const pill = $<HTMLFormElement>("[data-pill]")!;
const pillDates = initDatePicker(pill, $<HTMLInputElement>("[data-in]", pill)!, $<HTMLInputElement>("[data-out]", pill)!, D.intl, D.cal, { up: true });
let guests = 2;
const gOut = $("[data-g-out]", pill)!, gIn = $<HTMLInputElement>("[data-adults]", pill)!;
$$<HTMLButtonElement>("[data-g]", pill).forEach((b) => b.addEventListener("click", () => {
  guests = Math.min(6, Math.max(1, guests + Number(b.dataset.g)));
  gOut.textContent = String(guests);
  gIn.value = String(guests);
}));

const panel = $<HTMLDialogElement>("[data-panel]")!;
const pform = $<HTMLFormElement>("[data-pform]", panel)!;
const pIn = $<HTMLInputElement>("[data-pin]", pform)!, pOut = $<HTMLInputElement>("[data-pout]", pform)!;
const pAdults = $<HTMLSelectElement>("[data-padults]", pform)!, pChildren = $<HTMLSelectElement>("[data-pchildren]", pform)!;
const panelDates = initDatePicker(pform, pIn, pOut, D.intl, D.cal);
const list = $("[data-results-list]", panel)!, rTitle = $("[data-results-title]", panel)!, rOpen = $<HTMLAnchorElement>("[data-results-open]", panel)!;
panel.addEventListener("close", () => lock(false));
panel.addEventListener("click", (e) => { if (e.target === panel) panel.close(); });
$$("[data-close]", panel).forEach((b) => b.addEventListener("click", () => panel.close()));

function openPanel() {
  const { checkIn, checkOut } = pillDates.get();
  panelDates.set(checkIn, checkOut);
  pAdults.value = String(guests);
  if (!panel.open) { panel.showModal(); lock(true); }
  search();
}
pill.addEventListener("submit", (e) => { e.preventDefault(); openPanel(); });
$$("[data-open-book]").forEach((b) => b.addEventListener("click", openPanel));
pform.addEventListener("submit", (e) => { e.preventDefault(); search(); });

const fieldFmt = new Intl.DateTimeFormat(D.intl, { day: "numeric", month: "long", timeZone: "UTC" });
const pd = (s: string) => new Date(`${s}T12:00:00Z`);
function bookLink(content: string) {
  const u = new URL(D.book);
  u.search = new URLSearchParams({ lang: D.lang, checkIn: pIn.value, checkOut: pOut.value, adults: pAdults.value, children: pChildren.value, utm_source: "website", utm_medium: "referral", utm_content: content }).toString();
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
      return `<a class="plan" href="${esc(bookLink(`v3-plan-${p.key}`))}" rel="noopener"><span class="plan-name">${esc(p.name)}<small>${esc(sub)}</small>${dep ? `<small>${esc(dep)}</small>` : ""}</span><span class="plan-price">${ref > p.totalCents ? `<s>${eur(ref)}</s>` : ""}${eur(p.totalCents)}<small>${esc(D.r.total)} · ${eur(p.totalCents / nights)} ${esc(D.r.night)}</small></span><span class="plan-go">${esc(D.r.book)} →</span></a>`;
    }).join("");
    return `<article class="res"><div class="res-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" width="900" height="600">` : ""}</div><div class="res-body"><h3>${esc(room.name)}</h3><p class="res-meta">${meta.map((x) => `<span>${x}</span>`).join("")}</p><div class="plans">${plans}</div></div></article>`;
  }).join("");
  window.dispatchEvent(new CustomEvent("v3:results"));
}
let seq = 0;
async function search() {
  const id = ++seq;
  const n = Math.round((pd(pOut.value).getTime() - pd(pIn.value).getTime()) / 864e5);
  rTitle.textContent = fill(D.r.for, { in: fieldFmt.format(pd(pIn.value)), out: fieldFmt.format(pd(pOut.value)), n, g: Number(pAdults.value) + Number(pChildren.value) });
  rOpen.href = bookLink("v3-results");
  list.innerHTML = `<p class="res-note">${esc(D.r.loading)}</p><div class="skel"></div><div class="skel"></div>`;
  try {
    const q = new URLSearchParams({ checkIn: pIn.value, checkOut: pOut.value, adults: pAdults.value, children: pChildren.value, rooms: "1", lang: D.lang });
    const j = await (await fetch(`${new URL(D.book).origin}/api/public/availability?${q}`, { headers: { Accept: "application/json" } })).json();
    if (id !== seq) return;
    if (!j.ok) throw new Error(j.error);
    render(j.rooms as Room[], j.nights || n);
  } catch {
    if (id === seq) list.innerHTML = `<p class="results-msg">${esc(D.r.error)}</p>`;
  }
}

/* Mobile bar hides while the hero pill is on screen */
const mbar = $(".mbar");
if (mbar && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((e) => mbar.classList.toggle("is-away", e[0].isIntersecting), { threshold: 0.3 });
  io.observe(pill);
}

/* ───── Rooms rail: drag to scroll with the mouse; counter ───── */
const rail = $("[data-rail]")!;
const counter = $("[data-room-i]");
const cards = $$("[data-rcard]", rail);
let down = false, sx = 0, sl = 0, moved = false;
rail.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; rail.classList.add("is-drag"); } rail.scrollLeft = sl - dx; });
addEventListener("pointerup", () => { if (!down) return; down = false; rail.classList.remove("is-drag"); });
rail.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
rail.addEventListener("scroll", () => {
  const mid = rail.scrollLeft + rail.clientWidth * 0.3;
  let i = 0;
  cards.forEach((c, k) => { if (c.offsetLeft <= mid) i = k; });
  if (counter) counter.textContent = String(i + 1).padStart(2, "0");
}, { passive: true });

/* ───── Reviews ───── */
const rqs = $$("[data-rq]"), rds = $$<HTMLButtonElement>("[data-rd]");
let ri = 0;
const showQ = (i: number) => { rqs[ri].classList.remove("is-on"); rds[ri].classList.remove("is-on"); ri = i; rqs[ri].classList.add("is-on"); rds[ri].classList.add("is-on"); };
rds.forEach((b, i) => b.addEventListener("click", () => showQ(i)));
if (!reduce.matches) setInterval(() => { if (!document.hidden) showQ((ri + 1) % rqs.length); }, 6000);

/* ───── Live meltemi tile ───── */
const order: Wind[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const toWind = (deg: number) => order[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const bft = (k: number) => { const i = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118].findIndex((x) => k < x); return i === -1 ? 12 : i; };
const liveTile = $("[data-wind]");
if (liveTile && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(async (e) => {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    const { lat, lon } = D.geo;
    try {
      const [w, m] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m&timezone=Europe%2FAthens`).then((r) => r.json()),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature&timezone=Europe%2FAthens`).then((r) => r.json()).catch(() => null),
      ]);
      const dir = toWind(w.current.wind_direction_10m);
      liveTile.textContent = `${D.winds[dir]} ${bft(w.current.wind_speed_10m)} Bft`;
      const calm = D.beaches.filter((b) => b.sheltered.includes(dir)).sort((a, b) => a.km - b.km)[0];
      $("[data-calm]")!.textContent = (calm ?? D.beaches[0]).name;
      const sea = m?.current?.sea_surface_temperature;
      if (typeof sea === "number") $("[data-sea]")!.textContent = `${Math.round(sea)}°C`;
    } catch { /* keep dashes */ }
  }, { rootMargin: "300px" });
  io.observe(liveTile);
}

/* ───── Film lightbox (the hotel's own YouTube film, privacy-enhanced embed) ───── */
const filmBox = $<HTMLDialogElement>("[data-filmbox]")!, frame = $("[data-film-frame]")!;
$("[data-film]")!.addEventListener("click", (e) => {
  e.preventDefault();
  const f = document.createElement("iframe");
  f.src = "https://www.youtube-nocookie.com/embed/3AykK5Cc-A8?autoplay=1&rel=0";
  f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  f.title = "Hotel Corali";
  frame.replaceChildren(f);
  filmBox.showModal();
  lock(true);
});
filmBox.addEventListener("close", () => { frame.replaceChildren(); lock(false); });
filmBox.addEventListener("click", (e) => { if (e.target === filmBox) filmBox.close(); });
$("[data-close]", filmBox)!.addEventListener("click", () => filmBox.close());

/* ───── Motion ───── */
if (!reduce.matches) import("./v3-motion").then((m) => m.init()).catch(() => root.classList.remove("motion", "intro"));
else root.classList.remove("intro");
