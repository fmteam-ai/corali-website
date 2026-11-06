// v2 motion: Lenis smooth scroll + GSAP (ScrollTrigger, SplitText, Flip). Only loaded without "reduce motion";
// everything lives in gsap.matchMedia() so switching to reduced motion reverts it all.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function init() {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const root = document.documentElement;
  const w = window as unknown as { __v2Flip?: (apply: () => void) => void };
  const mm = gsap.matchMedia();

  mm.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 960px)" }, (ctx) => {
    const { motion, desktop } = ctx.conditions as Record<string, boolean>;
    if (!motion) { root.classList.remove("motion"); return; }
    root.classList.add("motion");

    const lenis = new Lenis({ autoRaf: false, lerp: 0.09, anchors: { offset: -80 } });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    // Calendar on phones is a bottom sheet: pause smooth scroll while it is open is not needed (it is fixed).

    /* Hero: words rise in, photo breathes and drifts with scroll */
    const split = SplitText.create("[data-split]", { type: "words", mask: "words", wordsClass: "word" });
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(split.words, { yPercent: 110, duration: 1.4, stagger: 0.08 })
      .to("[data-fade]", { opacity: 1, duration: 1.2, stagger: 0.12 }, 0.35)
      .from("[data-bar]", { y: 40, autoAlpha: 0, duration: 1.2 }, 0.5)
      .from("[data-hero-media] img", { scale: 1.18, duration: 2.4, ease: "power2.out" }, 0);
    gsap.to("[data-hero-media]", { yPercent: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-copy", { yPercent: -30, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });

    /* Reveals */
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.08, overwrite: true }),
    });

    /* Live chips slide in */
    gsap.from(".live-list li", { x: 30, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: "power3.out", scrollTrigger: { trigger: ".live", start: "top 92%", once: true } });

    /* Rooms: Flip between filter states */
    w.__v2Flip = (apply) => {
      const cards = gsap.utils.toArray<HTMLElement>(".room");
      const state = Flip.getState(cards);
      apply();
      Flip.from(state, { duration: 0.7, ease: "power3.inOut", absolute: true, scale: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 }), onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }), onComplete: () => ScrollTrigger.refresh() });
    };
    gsap.from(".room", { y: 60, autoAlpha: 0, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: "[data-room-grid]", start: "top 85%", once: true } });

    /* A day at Corali: pinned story on desktop — steps light up, photos cross-fade, the clock runs */
    if (desktop) {
      const steps = gsap.utils.toArray<HTMLElement>(".day-step");
      const frames = gsap.utils.toArray<HTMLElement>(".day-frame");
      const clockEl = document.querySelector<HTMLElement>("[data-day-clock]");
      const times = steps.map((s) => s.querySelector(".day-time")!.textContent!);
      let current = -1;
      const setStep = (i: number) => {
        if (i === current) return;
        current = i;
        steps.forEach((s, k) => s.classList.toggle("is-on", k === i));
        frames.forEach((f, k) => gsap.to(f, { opacity: k <= i ? 1 : 0, duration: 0.8, ease: "power2.out", overwrite: true }));
        if (clockEl) clockEl.textContent = times[i];
      };
      setStep(0);
      frames.forEach((f, k) => gsap.set(f, { zIndex: k }));
      ScrollTrigger.create({
        trigger: ".day-inner",
        start: "top top",
        end: () => `+=${innerHeight * (steps.length - 0.5)}`,
        pin: true,
        scrub: true,
        anticipatePin: 1,
        onUpdate: (self) => setStep(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
      });
      frames.forEach((f) => gsap.fromTo(f.querySelector("img"), { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".day-inner", start: "top top", end: () => `+=${innerHeight * steps.length}`, scrub: true } }));
    } else {
      gsap.utils.toArray<HTMLElement>(".day-step").forEach((s) => gsap.from(s, { y: 40, autoAlpha: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: s, start: "top 88%", once: true } }));
    }

    /* Concierge: the chat writes itself */
    gsap.to("[data-bubble]", { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)", stagger: 0.45, scrollTrigger: { trigger: ".chat", start: "top 80%", once: true } });

    /* Footer wordmark slides */
    gsap.fromTo("[data-word]", { xPercent: 10 }, { xPercent: -10, ease: "none", scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: true } });

    /* Results appear */
    const onResults = () => {
      gsap.from(".res", { y: 40, autoAlpha: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" });
      ScrollTrigger.refresh();
    };
    addEventListener("v2:results", onResults);

    /* Magnetic main buttons (mouse only) */
    const offs: (() => void)[] = [];
    if (matchMedia("(pointer: fine)").matches) {
      document.querySelectorAll<HTMLElement>(".bar-go, .ask .pill").forEach((el) => {
        const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3" }), y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3" });
        const mv = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.25); };
        const lv = () => { x(0); y(0); };
        el.addEventListener("pointermove", mv); el.addEventListener("pointerleave", lv);
        offs.push(() => { el.removeEventListener("pointermove", mv); el.removeEventListener("pointerleave", lv); });
      });
    }

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      split.revert();
      delete w.__v2Flip;
      removeEventListener("v2:results", onResults);
      offs.forEach((f) => f());
    };
  });
}
