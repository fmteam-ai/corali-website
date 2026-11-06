// Two-month date-range calendar that looks and behaves like the one on booking.hotelcorali.gr:
// Monday-first weeks, past days disabled, "Check-in" then automatically "Check-out", max 60 nights.
// Progressive enhancement: without JS the form keeps the native <input type="date"> fields.

type Labels = { checkIn: string; checkOut: string; prev: string; next: string; close: string; nights: string; night: string };

const MAX_NIGHTS = 60; // booking engine maximum (PMS lib/public-rate.ts)
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nightsBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
const todayIso = () => { const t = new Date(); return isoOf(t.getFullYear(), t.getMonth(), t.getDate()); };

const calendarIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8.5" cy="14" r="1.1" fill="currentColor"/><circle cx="12" cy="14" r="1.1" fill="currentColor"/><circle cx="15.5" cy="14" r="1.1" fill="currentColor"/></svg>`;

export function initDatePicker(form: HTMLFormElement, inInput: HTMLInputElement, outInput: HTMLInputElement, locale: string, t: Labels, opts: { up?: boolean; onChange?: (checkIn: string, checkOut: string) => void } = {}) {
  const today = todayIso();
  const fmtField = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const fmtLong = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const fmtWeekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => fmtWeekday.format(new Date(Date.UTC(2024, 0, 1 + i, 12)))); // 1 Jan 2024 = Monday

  let checkIn = addDays(today, 7);
  let checkOut = addDays(checkIn, 4);
  let mode: "in" | "out" | null = null;
  let month = parse(checkIn); // first visible month
  month.setUTCDate(1);

  // Replace the native inputs with buttons (the inputs stay as hidden fields for the GET form).
  const makeButton = (input: HTMLInputElement, which: "in" | "out") => {
    input.type = "hidden";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "qb-date";
    b.dataset.cal = which;
    b.setAttribute("aria-haspopup", "dialog");
    b.setAttribute("aria-expanded", "false");
    b.innerHTML = `<span></span>${calendarIcon}`;
    input.after(b);
    b.addEventListener("click", () => (mode === which ? close() : open(which)));
    return b;
  };
  const inBtn = makeButton(inInput, "in");
  const outBtn = makeButton(outInput, "out");

  const pop = document.createElement("div");
  pop.className = opts.up ? "cal cal-up" : "cal";
  pop.setAttribute("role", "dialog");
  pop.hidden = true;
  pop.innerHTML = `<div class="cal-nav"><button type="button" class="cal-arrow" data-prev aria-label="${t.prev}">‹</button><b class="cal-title"></b><button type="button" class="cal-arrow" data-next aria-label="${t.next}">›</button></div><div class="cal-months"></div><p class="cal-foot"><span class="cal-nights"></span><button type="button" class="cal-close">${t.close}</button></p>`;
  form.append(pop);
  const title = pop.querySelector<HTMLElement>(".cal-title")!;
  const months = pop.querySelector<HTMLElement>(".cal-months")!;
  const prev = pop.querySelector<HTMLButtonElement>("[data-prev]")!;
  const nights = pop.querySelector<HTMLElement>(".cal-nights")!;

  const sync = () => {
    inInput.value = checkIn;
    outInput.value = checkOut;
    inBtn.firstElementChild!.textContent = fmtField.format(parse(checkIn));
    outBtn.firstElementChild!.textContent = fmtField.format(parse(checkOut));
    inBtn.setAttribute("aria-label", `${t.checkIn}: ${fmtLong.format(parse(checkIn))}`);
    outBtn.setAttribute("aria-label", `${t.checkOut}: ${fmtLong.format(parse(checkOut))}`);
    const n = nightsBetween(checkIn, checkOut);
    nights.textContent = (n === 1 ? t.night : t.nights).replace("{n}", String(n));
    opts.onChange?.(checkIn, checkOut);
  };

  const monthsShown = () => (matchMedia("(min-width: 700px)").matches ? 2 : 1);

  function render() {
    if (!mode) return;
    title.textContent = mode === "in" ? t.checkIn : t.checkOut;
    pop.setAttribute("aria-label", title.textContent);
    const min = mode === "in" ? today : addDays(checkIn, 1);
    const max = mode === "in" ? null : addDays(checkIn, MAX_NIGHTS);
    const first = parse(today); first.setUTCDate(1);
    prev.disabled = month.getTime() <= first.getTime();
    const value = mode === "in" ? checkIn : checkOut;
    let html = "";
    for (let k = 0; k < monthsShown(); k++) {
      const y = month.getUTCFullYear(), m = month.getUTCMonth() + k;
      const head = new Date(Date.UTC(y, m, 1, 12));
      const yy = head.getUTCFullYear(), mm = head.getUTCMonth();
      const offset = (head.getUTCDay() + 6) % 7; // Monday first
      const days = new Date(Date.UTC(yy, mm + 1, 0, 12)).getUTCDate();
      html += `<div class="cal-month"><p class="cal-mname">${fmtMonth.format(head)}</p><div class="cal-grid" role="grid">`;
      html += weekdays.map((w) => `<span class="cal-wd" aria-hidden="true">${w}</span>`).join("");
      html += "<span></span>".repeat(offset);
      for (let d = 1; d <= days; d++) {
        const iso = isoOf(yy, mm, d);
        const off = iso < min || (max !== null && iso > max);
        const cls = ["cal-day"];
        if (iso === value) cls.push("is-selected");
        if (iso === checkIn) cls.push("is-start");
        if (iso === checkOut) cls.push("is-end");
        if (iso > checkIn && iso < checkOut) cls.push("in-range");
        if (iso === today) cls.push("is-today");
        html += `<button type="button" class="${cls.join(" ")}" data-day="${iso}" ${off ? "disabled" : ""} aria-pressed="${iso === value}" aria-label="${fmtLong.format(parse(iso))}">${d}</button>`;
      }
      html += "</div></div>";
    }
    months.innerHTML = html;
  }

  function open(which: "in" | "out") {
    mode = which;
    month = parse(which === "in" ? checkIn : checkOut);
    month.setUTCDate(1);
    // When choosing check-out in a two-month view, keep check-in's month visible on the left.
    if (which === "out" && monthsShown() === 2) { const s = parse(checkIn); s.setUTCDate(1); month = s; }
    pop.hidden = false;
    pop.dataset.mode = which;
    inBtn.setAttribute("aria-expanded", String(which === "in"));
    outBtn.setAttribute("aria-expanded", String(which === "out"));
    inBtn.classList.toggle("is-active", which === "in");
    outBtn.classList.toggle("is-active", which === "out");
    render();
    pop.querySelector<HTMLButtonElement>(".cal-day.is-selected:not([disabled]), .cal-day:not([disabled])")?.focus({ preventScroll: true });
    // On small screens bring the whole calendar into view.
    const r = pop.getBoundingClientRect();
    if (r.bottom > innerHeight - 12) scrollBy({ top: Math.min(r.bottom - innerHeight + 24, r.top - 80), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  function close(focusBack = false) {
    const was = mode;
    mode = null;
    pop.hidden = true;
    [inBtn, outBtn].forEach((b) => { b.setAttribute("aria-expanded", "false"); b.classList.remove("is-active"); });
    if (focusBack && was) (was === "in" ? inBtn : outBtn).focus();
  }

  months.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-day]");
    if (!b || b.disabled) return;
    const v = b.dataset.day!;
    if (mode === "in") {
      checkIn = v;
      if (checkOut <= checkIn || nightsBetween(checkIn, checkOut) > MAX_NIGHTS) checkOut = addDays(checkIn, 1);
      sync();
      open("out"); // like the booking engine: go straight on to the check-out date
    } else {
      checkOut = v;
      sync();
      close(true);
    }
  });
  prev.addEventListener("click", () => { month.setUTCMonth(month.getUTCMonth() - 1); render(); });
  pop.querySelector("[data-next]")!.addEventListener("click", () => { month.setUTCMonth(month.getUTCMonth() + 1); render(); });
  pop.querySelector(".cal-close")!.addEventListener("click", () => close(true));
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(true); return; }
    const cur = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-day]");
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!cur || !step) return;
    e.preventDefault();
    const target = addDays(cur.dataset.day!, step);
    let next = pop.querySelector<HTMLButtonElement>(`[data-day="${target}"]`);
    if (!next) { month.setUTCMonth(month.getUTCMonth() + (step > 0 ? 1 : -1)); render(); next = pop.querySelector<HTMLButtonElement>(`[data-day="${target}"]`); }
    if (next && !next.disabled) next.focus();
  });
  document.addEventListener("pointerdown", (e) => {
    if (mode && !pop.contains(e.target as Node) && !(e.target as HTMLElement).closest(".qb-date")) close();
  });
  addEventListener("resize", () => mode && render());

  sync();
}
