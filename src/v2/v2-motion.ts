// v2 "Island Index" motion: fly through the CORALI letters, text fill, horizontal film strip, cursor-follow room
// images, terminal typing. Lenis smooth scroll on desktop only (phones keep native scroll-snap stories).
// All inside gsap.matchMedia(): switching on "reduce motion" reverts everything.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function init() {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 960px)", fine: "(pointer: fine)" }, (ctx) => {
    const { motion, desktop, fine } = ctx.conditions as Record<string, boolean>;
    if (!motion) { root.classList.remove("motion"); return; }
    root.classList.add("motion");
    const offs: (() => void)[] = [];

    let lenis: Lenis | null = null;
    if (desktop) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.085, anchors: true });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (t: number) => lenis!.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const lock = () => lenis!.stop(), unlock = () => lenis!.start();
      addEventListener("v2:lock", lock); addEventListener("v2:unlock", unlock);
      offs.push(() => { gsap.ticker.remove(raf); removeEventListener("v2:lock", lock); removeEventListener("v2:unlock", unlock); lenis!.destroy(); });
    }

    /* 01 Arrive — letters drop in, then the camera flies through the "O" into the photo */
    // One piece of text (background-clip:text breaks if letters are transformed separately): reveal it bottom-up.
    gsap.fromTo(".wordmark", { clipPath: "inset(100% 0% 0% 0%)", yPercent: 12 }, { clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 1.6, ease: "expo.out" });
    gsap.from(".arrive-meta > *, .scroll-hint", { y: 24, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1, delay: 0.5 });
    gsap.timeline({ scrollTrigger: { trigger: ".arrive", start: "top top", end: "bottom bottom", scrub: 0.6 } })
      .to(".wordmark", { scale: desktop ? 14 : 18, transformOrigin: "29% 50%", ease: "power2.in", duration: 1 }, 0)
      .to(".wordmark", { opacity: 0, duration: 0.25 }, 0.7)
      .fromTo(".arrive-photo", { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, ease: "power2.out", duration: 0.6 }, 0.45)
      .to(".arrive-meta, .scroll-hint", { opacity: 0, y: -30, duration: 0.3 }, 0);

    /* Statement — the sentence fills with light as you read it */
    gsap.to(".statement-text", { backgroundPosition: "0% 0", ease: "none", scrollTrigger: { trigger: ".statement-text", start: "top 80%", end: "bottom 40%", scrub: true } });
    gsap.from(".statement-figs b", { yPercent: 40, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: ".statement-figs", start: "top 85%", once: true } });

    /* Chapter titles */
    gsap.utils.toArray<HTMLElement>(".ch-head h2").forEach((h) => gsap.from(h, { yPercent: 30, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 88%", once: true } }));

    /* 02 Rooms index rows + phone stories */
    gsap.from(".r-row", { x: -40, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: ".r-index", start: "top 80%", once: true } });
    gsap.utils.toArray<HTMLElement>(".story-copy").forEach((c) => gsap.from(c.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: c, start: "top 92%", once: true } }));

    /* Cursor + image that follows the cursor over the rooms index (mouse, desktop) */
    if (desktop && fine) {
      document.body.classList.add("has-cursor");
      const cur = document.querySelector<HTMLElement>("[data-cursor]")!;
      const follow = document.querySelector<HTMLElement>("[data-follow]")!;
      const fimg = document.querySelector<HTMLImageElement>("[data-follow-img]")!;
      const cx = gsap.quickTo(cur, "x", { duration: 0.18, ease: "power3" }), cy = gsap.quickTo(cur, "y", { duration: 0.18, ease: "power3" });
      const fx = gsap.quickTo(follow, "x", { duration: 0.6, ease: "power3" }), fy = gsap.quickTo(follow, "y", { duration: 0.6, ease: "power3" });
      const move = (e: PointerEvent) => { cx(e.clientX); cy(e.clientY); fx(e.clientX + 30); fy(e.clientY - 190); };
      addEventListener("pointermove", move);
      const rows = [...document.querySelectorAll<HTMLElement>("button.r-row")];
      const enter = (e: Event) => {
        const r = e.currentTarget as HTMLElement;
        if (fimg.src !== new URL(r.dataset.img!, location.href).href) fimg.src = r.dataset.img!;
        gsap.to(follow, { opacity: 1, scale: 1, rotation: gsap.utils.random(-4, 4), duration: 0.45, ease: "power3.out", overwrite: "auto" });
        cur.classList.add("is-big");
      };
      const leave = () => { gsap.to(follow, { opacity: 0, scale: 0.85, duration: 0.3, overwrite: "auto" }); cur.classList.remove("is-big"); };
      rows.forEach((r) => { r.addEventListener("pointerenter", enter); r.addEventListener("pointerleave", leave); });
      const big = [...document.querySelectorAll<HTMLElement>(".frame, .c-book, .btn-solid")];
      const bOn = () => cur.classList.add("is-big"), bOff = () => cur.classList.remove("is-big");
      big.forEach((b) => { b.addEventListener("pointerenter", bOn); b.addEventListener("pointerleave", bOff); });
      offs.push(() => {
        document.body.classList.remove("has-cursor");
        removeEventListener("pointermove", move);
        rows.forEach((r) => { r.removeEventListener("pointerenter", enter); r.removeEventListener("pointerleave", leave); });
        big.forEach((b) => { b.removeEventListener("pointerenter", bOn); b.removeEventListener("pointerleave", bOff); });
      });
    }

    /* 03 A day — pinned horizontal film strip on desktop */
    if (desktop) {
      const strip = document.querySelector<HTMLElement>("[data-strip]")!;
      const dist = () => Math.max(0, strip.scrollWidth - (strip.parentElement!.clientWidth));
      const tween = gsap.to(strip, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: "[data-day-pin]", start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (s) => gsap.set("[data-strip-progress]", { scaleX: s.progress }) } });
      gsap.utils.toArray<HTMLElement>(".frame img").forEach((img) => gsap.fromTo(img, { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: img, containerAnimation: tween, start: "left right", end: "right left", scrub: true } }));
    } else {
      const strip = document.querySelector<HTMLElement>("[data-strip]")!;
      const bar = document.querySelector<HTMLElement>("[data-strip-progress]")!;
      const onS = () => gsap.set(bar, { scaleX: strip.scrollLeft / Math.max(1, strip.scrollWidth - strip.clientWidth) });
      strip.addEventListener("scroll", onS, { passive: true });
      offs.push(() => strip.removeEventListener("scroll", onS));
    }

    /* 04 Ask — the terminal types itself */
    const lines = gsap.utils.toArray<HTMLElement>("[data-type]");
    const texts = lines.map((l) => l.textContent!);
    lines.forEach((l) => (l.textContent = ""));
    ScrollTrigger.create({
      trigger: ".term", start: "top 75%", once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        lines.forEach((l, i) => {
          const o = { n: 0 };
          tl.to(o, { n: texts[i].length, duration: Math.min(1.6, texts[i].length * 0.022), ease: "none", onUpdate: () => (l.textContent = texts[i].slice(0, Math.round(o.n))) }, i ? "+=0.35" : 0);
        });
      },
    });
    offs.push(() => lines.forEach((l, i) => (l.textContent = texts[i])));

    /* 05 Find */
    gsap.from(".find-coords", { yPercent: 20, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".find-coords", start: "top 88%", once: true } });
    gsap.fromTo(".find-bg", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".find", start: "top bottom", end: "bottom top", scrub: true } });

    /* Live results inside the sheet */
    const onRes = () => gsap.from(".sheet .res", { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" });
    addEventListener("v2:results", onRes);
    offs.push(() => removeEventListener("v2:results", onRes));

    // Lazy images change the page height when they arrive: recompute trigger positions (debounced).
    // (This module loads after window "load", so listen to each image instead.)
    let rt = 0;
    const refresh = () => { clearTimeout(rt); rt = window.setTimeout(() => ScrollTrigger.refresh(), 150); };
    document.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", refresh, { once: true }); });
    document.fonts?.ready.then(refresh);
    if (document.readyState !== "complete") addEventListener("load", refresh, { once: true });
    offs.push(() => clearTimeout(rt));

    return () => {
      offs.forEach((f) => f());
    };
  });
}
