"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Site-wide animation controller. Blocks render pure markup with
 * data-ax-* attributes; this component finds them after mount and
 * wires up GSAP/Lenis. It is only mounted in the public (site)
 * layout, so the admin editor canvas stays static.
 *
 * GSAP (+ScrollTrigger +SplitText) and Lenis are imported lazily so
 * their ~130KB of JS stays off the initial bundle. The `ax-js` class
 * (which hides reveal/headline elements until they animate in) is only
 * added once those libraries resolve, and removed again if they fail to
 * load, so content can never get stuck hidden.
 */
export default function SiteFX() {
  const pathname = usePathname();
  const cursorRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { SplitText }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"),
        import("lenis"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      document.documentElement.classList.add("ax-js");

      const lenis = new Lenis({ lerp: 0.11 });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // Anchor links go through Lenis for a smooth glide
      const onAnchorClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
        if (!a) return;
        const target = document.querySelector(a.getAttribute("href") || "");
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target as HTMLElement, { offset: -80 });
        }
      };
      document.addEventListener("click", onAnchorClick);

      const ctx = gsap.context(() => {
        // Scroll progress bar
        if (progressRef.current) {
          gsap.to(progressRef.current, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { start: 0, end: () => document.body.scrollHeight - innerHeight, scrub: 0.3 },
          });
        }

        // Hide header on scroll down, show on scroll up
        const header = document.querySelector(".site-header");
        if (header) {
          ScrollTrigger.create({
            start: "top top",
            onUpdate: (self) => {
              gsap.to(header, {
                yPercent: self.direction === 1 && self.scroll() > 240 ? -100 : 0,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto",
              });
            },
          });
        }

        // Headline char reveals (hero: on load; others: on scroll)
        document.fonts.ready.then(() => {
          gsap.utils.toArray<HTMLElement>("[data-ax-chars]").forEach((el) => {
            const split = new SplitText(el, { type: "lines,chars", linesClass: "ax-split-line" });
            gsap.set(el, { autoAlpha: 1 });
            const inHero = !!el.closest(".ax-hero");
            gsap.from(split.chars, {
              yPercent: 112,
              duration: 0.9,
              ease: "power4.out",
              stagger: 0.016,
              delay: inHero ? 0.15 : 0,
              scrollTrigger: inHero ? undefined : { trigger: el, start: "top 86%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-ax-words]").forEach((el) => {
            const split = new SplitText(el, { type: "words" });
            gsap.set(el, { autoAlpha: 1 });
            gsap.from(split.words, {
              autoAlpha: 0,
              y: 18,
              duration: 0.6,
              ease: "power3.out",
              stagger: 0.025,
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            });
          });

          ScrollTrigger.refresh();
        });

        // Generic fade-up reveals
        gsap.utils.toArray<HTMLElement>("[data-ax-reveal]").forEach((el) => {
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: 30 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.95,
              ease: "power3.out",
              delay: parseFloat(el.dataset.axDelay || "0"),
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            }
          );
        });

        // Terminal typing
        gsap.utils.toArray<HTMLElement>("[data-ax-typer]").forEach((term) => {
          const lines = Array.from(term.querySelectorAll<HTMLElement>(".t-line"));
          if (!lines.length) return;
          const texts = lines.map((l) => l.textContent || "");
          lines.forEach((l) => (l.textContent = ""));
          const caret = document.createElement("span");
          caret.className = "ax-caret";

          const tl = gsap.timeline({
            scrollTrigger: { trigger: term, start: "top 78%", once: true },
          });
          lines.forEach((line, i) => {
            const text = texts[i];
            const isCmd = line.classList.contains("t-cmd");
            const node = document.createTextNode("");
            line.appendChild(node);
            const proxy = { n: 0 };
            tl.to(proxy, {
              n: text.length,
              duration: Math.min(text.length * (isCmd ? 0.028 : 0.006), isCmd ? 1.6 : 0.5),
              ease: "none",
              onStart: () => line.appendChild(caret),
              onUpdate: () => {
                node.nodeValue = text.slice(0, Math.round(proxy.n));
              },
            });
            if (isCmd) tl.to({}, { duration: 0.25 });
          });
          tl.add(() => caret.remove());
        });

        // Image parallax inside masked figures
        gsap.utils.toArray<HTMLElement>("[data-ax-parallax]").forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: "none",
              scrollTrigger: { trigger: img.closest("figure") || img, scrub: 0.6 },
            }
          );
        });

        // Magnetic buttons
        gsap.utils.toArray<HTMLElement>("[data-ax-magnetic]").forEach((btn) => {
          const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
          const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });
          btn.addEventListener("mousemove", (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.3);
            yTo((e.clientY - r.top - r.height / 2) * 0.45);
          });
          btn.addEventListener("mouseleave", () => {
            xTo(0);
            yTo(0);
          });
        });
      });

      // Custom cursor glow
      const cursor = cursorRef.current;
      let cursorOn = false;
      const onMove = (e: MouseEvent) => {
        if (!cursor) return;
        if (!cursorOn) {
          cursorOn = true;
          gsap.set(cursor, { opacity: 1 });
        }
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.35, ease: "power3.out" });
        const interactive = (e.target as HTMLElement).closest("a, button, summary, input, select, textarea");
        gsap.to(cursor, { scale: interactive ? 2.1 : 1, duration: 0.3 });
      };
      window.addEventListener("mousemove", onMove);

      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);

      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(raf);
        lenis.destroy();
        document.removeEventListener("click", onAnchorClick);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("load", onLoad);
      };
    })().catch(() => {
      // If the animation libs fail to load, reveal content unanimated.
      document.documentElement.classList.remove("ax-js");
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [pathname]);

  return (
    <>
      <div className="ax-grain" aria-hidden />
      <div className="ax-progress" ref={progressRef} aria-hidden />
      <div className="ax-cursor" ref={cursorRef} aria-hidden />
    </>
  );
}
