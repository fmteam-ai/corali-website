// v3 motion: intro curtain, hero line reveals, curtain-style image reveals, amphora line drawing, pinned
// horizontal gallery, parallax, "Drag" cursor. Lenis smooth scroll. Everything inside gsap.matchMedia().
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
    if (!motion) { root.classList.remove("motion", "intro"); return; }
    root.classList.add("motion");
    const offs: (() => void)[] = [];

    const lenis = new Lenis({ autoRaf: false, lerp: 0.08, anchors: { offset: 0 } });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const stop = () => lenis.stop(), start = () => lenis.start();
    addEventListener("v3:lock", stop); addEventListener("v3:unlock", start);
    offs.push(() => { gsap.ticker.remove(raf); removeEventListener("v3:lock", stop); removeEventListener("v3:unlock", start); lenis.destroy(); });

    /* Intro curtain (first visit of the session): the sun draws itself, the curtain lifts */
    const heroIn = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } })
      .from("[data-hero-line]", { yPercent: 110, duration: 1.5, stagger: 0.12 })
      .from("[data-hero-fade]", { opacity: 0, y: 16, duration: 1.1, stagger: 0.1 }, 0.4)
      .from("[data-pill]", { y: 40, opacity: 0, duration: 1.2 }, 0.55)
      .from(".hd", { autoAlpha: 0, duration: 1, clearProps: "opacity,visibility" }, 0.3); // fade only: CSS owns its position
    if (root.classList.contains("intro")) {
      const sun = document.querySelectorAll<SVGGeometryElement>(".curtain-sun circle, .curtain-sun line, .curtain-sun path");
      sun.forEach((s) => { const l = s.getTotalLength(); s.style.strokeDasharray = `${l}`; s.style.strokeDashoffset = `${l}`; });
      gsap.timeline()
        .to(sun, { strokeDashoffset: 0, duration: 1, ease: "power2.inOut", stagger: 0.02 })
        .from(".curtain-word", { opacity: 0, y: 12, duration: 0.6 }, 0.3)
        .to("[data-curtain]", { yPercent: -100, duration: 1, ease: "expo.inOut" }, "+=0.15")
        .add(() => heroIn.play(), "-=0.55")
        .add(() => root.classList.remove("intro"));
    } else heroIn.play();

    /* Hero parallax */
    gsap.to(".slides", { yPercent: 16, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-copy", { yPercent: -40, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "30% top", end: "bottom top", scrub: true } });

    /* Reveals */
    ScrollTrigger.batch("[data-rv]", { start: "top 88%", once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.1, overwrite: true }) });

    /* Amphora line drawing, scrubbed */
    const paths = document.querySelectorAll<SVGGeometryElement>("[data-draw] path, [data-draw] circle");
    paths.forEach((p) => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
    gsap.to(paths, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".intro", start: "top 80%", end: "center 45%", scrub: true } });

    /* Curtain reveals for photos (mosaic, rooms, experiences) */
    gsap.utils.toArray<HTMLElement>(".mfig, .rcard-img, .xp, .find-img").forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      const img = el.querySelector("img");
      if (img) gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    gsap.utils.toArray<HTMLElement>(".blk").forEach((b) => gsap.from(b.children, { y: 26, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 85%", once: true } }));
    gsap.fromTo(".find-img img", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".find", start: "top bottom", end: "bottom top", scrub: true } });

    /* Gallery: pinned horizontal strip on desktop */
    if (desktop) {
      const track = document.querySelector<HTMLElement>("[data-gal-track]")!;
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: "[data-gal-pin]", start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
    }

    /* Menu links slide in */
    const onMenu = (e: Event) => { if ((e as CustomEvent<boolean>).detail) gsap.from(".menu-nav li", { yPercent: 60, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.07 }); };
    addEventListener("v3:menu", onMenu);
    offs.push(() => removeEventListener("v3:menu", onMenu));

    /* Results */
    const onRes = () => gsap.from(".panel .res", { y: 24, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" });
    addEventListener("v3:results", onRes);
    offs.push(() => removeEventListener("v3:results", onRes));

    /* "Drag" cursor over the rooms rail and gallery (mouse only) */
    if (fine) {
      document.body.classList.add("has-cur");
      const cur = document.querySelector<HTMLElement>("[data-cur]")!;
      const x = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3" }), y = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3" });
      const mv = (e: PointerEvent) => { x(e.clientX); y(e.clientY); };
      addEventListener("pointermove", mv);
      const zones = [...document.querySelectorAll<HTMLElement>("[data-rail], [data-gal-track]")];
      const on = () => gsap.to(cur, { scale: 1, duration: 0.4, ease: "back.out(2)" }), off = () => gsap.to(cur, { scale: 0, duration: 0.3 });
      zones.forEach((z) => { z.addEventListener("pointerenter", on); z.addEventListener("pointerleave", off); });
      offs.push(() => { document.body.classList.remove("has-cur"); removeEventListener("pointermove", mv); zones.forEach((z) => { z.removeEventListener("pointerenter", on); z.removeEventListener("pointerleave", off); }); });
    }

    // Lazy images change the page height when they arrive: recompute trigger positions (debounced).
    // (This module loads after window "load", so listen to each image instead.)
    let rt = 0;
    const refresh = () => { clearTimeout(rt); rt = window.setTimeout(() => ScrollTrigger.refresh(), 150); };
    document.querySelectorAll("img").forEach((img) => { if (!img.complete) img.addEventListener("load", refresh, { once: true }); });
    document.fonts?.ready.then(refresh);
    if (document.readyState !== "complete") addEventListener("load", refresh, { once: true });
    offs.push(() => clearTimeout(rt));
    return () => offs.forEach((f) => f());
  });
}
