// GSAP + ScrollTrigger + Lenis. Loaded only when the device allows motion (see main.ts).
// Everything is created inside gsap.matchMedia(), so if the user switches on "reduce motion" while the page is
// open, all tweens/ScrollTriggers are reverted and Lenis is destroyed automatically.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      reduce: "(prefers-reduced-motion: reduce)",
      desktop: "(min-width: 900px)",
      fine: "(pointer: fine)",
    },
    (ctx) => {
      const { motion, desktop, fine } = ctx.conditions as Record<string, boolean>;
      if (!motion) {
        root.classList.remove("motion");
        return;
      }
      root.classList.add("motion");

      /* ── Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync ── */
      const lenis = new Lenis({ autoRaf: false, lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.1, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const lock = () => lenis.stop();
      const unlock = () => lenis.start();
      addEventListener("corali:lock", lock);
      addEventListener("corali:unlock", unlock);

      const headerH = () => parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 64;
      const onLink = (e: Event) => {
        const a = e.currentTarget as HTMLAnchorElement;
        const id = a.hash && document.getElementById(a.hash.slice(1));
        if (!id || a.pathname !== location.pathname) return;
        e.preventDefault();
        lenis.scrollTo(id, { offset: -headerH() + 1, duration: 1.4 });
        history.pushState(null, "", a.hash);
      };
      const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-scroll-link]")];
      links.forEach((a) => a.addEventListener("click", onLink));

      /* ── Hero: lines rise in, then the arch window opens to full-bleed as you scroll ── */
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      const slot = document.querySelector<HTMLElement>("[data-hero-slot]");
      const arch = document.querySelector<HTMLElement>("[data-hero-arch]");
      const img = document.querySelector<HTMLElement>("[data-hero-img]");
      if (hero && slot && arch) {
        const archClip = () => {
          const box = arch.getBoundingClientRect();
          const s = slot.getBoundingClientRect();
          const t = s.top - box.top, l = s.left - box.left, r = box.right - s.right, b = box.bottom - s.bottom;
          const rad = s.width / 2;
          return `inset(${t}px ${r}px ${b}px ${l}px round ${rad}px ${rad}px 26px 26px)`;
        };
        gsap.set(arch, { clipPath: archClip() });

        gsap.timeline({ defaults: { ease: "power4.out" } })
          .from("[data-hero-line]", { yPercent: 115, duration: 1.3, stagger: 0.12 })
          .from(img, { scale: 1.35, duration: 1.8, ease: "power3.out" }, 0)
          .from("[data-hero-fade]", { autoAlpha: 0, y: 20, duration: 1, stagger: 0.1 }, 0.35);

        gsap.timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        })
          .fromTo(arch, { clipPath: archClip }, { clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)", ease: "power2.inOut", duration: 1 }, 0)
          .to(img, { scale: 1.08, ease: "none", duration: 1 }, 0)
          .to(".hero-copy", { yPercent: -60, autoAlpha: 0, ease: "power1.in", duration: 0.5 }, 0)
          .to(".hero-bottom", { yPercent: 40, autoAlpha: 0, ease: "power1.in", duration: 0.4 }, 0)
          .to(".scroll-cue", { autoAlpha: 1, duration: 0.2 }, 0.55);
      }

      /* ── Marquee: endless, speeds up and flips with scroll velocity ── */
      const track = document.querySelector<HTMLElement>("[data-marquee]");
      if (track) {
        const loop = gsap.to(track, { xPercent: -50, ease: "none", duration: desktop ? 38 : 26, repeat: -1 });
        let dir = 1;
        ScrollTrigger.create({
          trigger: track,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = self.getVelocity() / 300;
            if (self.direction !== dir) dir = self.direction;
            gsap.to(loop, { timeScale: dir * Math.min(Math.max(Math.abs(v), 1), 5), duration: 0.3, overwrite: true, onComplete: () => void gsap.to(loop, { timeScale: dir, duration: 1.2 }) });
          },
        });
        gsap.to(".marquee-sun", { rotation: 360, ease: "none", repeat: -1, duration: 12, transformOrigin: "50% 50%" });
      }

      /* ── Reveals (batched) ── */
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        once: true,
        onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.08, overwrite: true }),
      });

      /* ── Statement text lights up word by word ── */
      document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
        if (!el.dataset.split) {
          el.dataset.split = "1";
          el.innerHTML = el.textContent!.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
        }
        gsap.to(el.querySelectorAll(".w"), {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 45%", scrub: true },
        });
      });

      /* ── Counters ── */
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count);
        const o = { v: 0 };
        gsap.to(o, {
          v: end,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => (el.textContent = String(Math.round(o.v))),
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      /* ── Rooms: pinned horizontal scroll on desktop; native swipe carousel on phones ── */
      const rooms = document.querySelector<HTMLElement>("[data-rooms]");
      const roomTrack = document.querySelector<HTMLElement>("[data-rooms-track]");
      if (desktop && rooms && roomTrack) {
        const distance = () => Math.max(0, roomTrack.scrollWidth - innerWidth);
        const h = gsap.to(roomTrack, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: rooms, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        roomTrack.querySelectorAll<HTMLElement>(".room-media img").forEach((im) => {
          gsap.fromTo(im, { xPercent: -8, scale: 1.18 }, { xPercent: 8, scale: 1.18, ease: "none", scrollTrigger: { trigger: im, containerAnimation: h, start: "left right", end: "right left", scrub: true } });
        });
      } else if (roomTrack) {
        gsap.from(roomTrack.children, { x: 80, autoAlpha: 0, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: roomTrack, start: "top 85%", once: true } });
      }

      /* ── Meltemi guide: list re-animates when the wind changes ── */
      const onBeaches = (e: Event) => {
        const items = (e as CustomEvent<HTMLElement[]>).detail.filter((li) => li.classList.contains("is-sheltered"));
        gsap.fromTo(items, { x: -12 }, { x: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.03, overwrite: true });
      };
      addEventListener("corali:beaches", onBeaches);
      gsap.from(".compass-dial", { rotation: -90, autoAlpha: 0, scale: 0.8, duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: ".compass-dial", start: "top 85%", once: true } });

      /* ── Village photo parallax ── */
      gsap.fromTo("[data-parallax]", { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: "#village", start: "top bottom", end: "bottom top", scrub: true } });
      gsap.from(".village-list li", { y: 60, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".village-list", start: "top 85%", once: true } });

      /* ── CTA: the sun turns with the scroll, "Corali" slides ── */
      gsap.to("[data-spin]", { rotation: 200, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: 1 } });
      gsap.fromTo("[data-giant]", { xPercent: 12 }, { xPercent: -12, ease: "none", scrollTrigger: { trigger: ".cta", start: "top bottom", end: "bottom top", scrub: true } });

      /* ── Magnetic main button (mouse only) ── */
      const magnets = fine ? [...document.querySelectorAll<HTMLElement>("[data-magnetic]")] : [];
      const handlers = magnets.map((m) => {
        const x = gsap.quickTo(m, "x", { duration: 0.5, ease: "power3" });
        const y = gsap.quickTo(m, "y", { duration: 0.5, ease: "power3" });
        const move = (e: PointerEvent) => { const r = m.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.3); };
        const leave = () => { x(0); y(0); };
        m.addEventListener("pointermove", move);
        m.addEventListener("pointerleave", leave);
        return () => { m.removeEventListener("pointermove", move); m.removeEventListener("pointerleave", leave); };
      });

      // Fonts and lazy images change the layout → recompute trigger positions once they settle.
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

      return () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        removeEventListener("corali:lock", lock);
        removeEventListener("corali:unlock", unlock);
        removeEventListener("corali:beaches", onBeaches);
        links.forEach((a) => a.removeEventListener("click", onLink));
        handlers.forEach((off) => off());
      };
    },
  );
}
