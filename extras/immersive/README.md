# Immersive add-on (optional)

Slim Minima ships **slim on purpose.** The default public site has zero
animation libraries, so the initial JavaScript bundle stays tiny and Total
Blocking Time stays low. This folder holds an opt-in module for teams that want
an immersive, animated site (WebGL hero, scroll reveals, smooth scrolling,
custom cursor).

**Nothing here ships until you wire it in.** The files live outside `src/` and
are excluded from `tsconfig.json`, so they are never typechecked, bundled, or
deployed by default. `three`, `gsap`, and `lenis` are NOT installed by default.

## What's in here

| File | What it does | Library | ~size (gz) |
| --- | --- | --- | --- |
| `SiteFX.tsx` | Scroll reveals, headline splits, smooth scroll, scroll progress, header hide-on-scroll, magnetic buttons, parallax, terminal typing, custom cursor | GSAP + ScrollTrigger + SplitText + Lenis | ~130KB |
| `HeroScene.tsx` | WebGL particle-terrain hero background | three.js | ~125KB |
| `immersive.css` | Styles for the grain, progress bar, cursor, reveal gating, caret, hero canvas | - | - |

Both components load their libraries with **dynamic `import()` inside the
effect**, so even after you enable them the ~255KB of JS downloads as async
chunks *after* hydration (or when the hero mounts), never on the critical path.
This is the pattern that keeps an immersive build from bloating first paint.

## How it works

Blocks render plain, server-rendered markup tagged with `data-ax-*` attributes.
`SiteFX` mounts once in the public layout, finds those elements after hydration,
and animates them. The admin editor canvas never mounts `SiteFX`, so editing
stays static and fast. Supported hooks:

- `data-ax-reveal` (optional `data-ax-delay="0.2"`) - fade-up on scroll
- `data-ax-chars` - per-character headline reveal (hero animates on load)
- `data-ax-words` - per-word reveal
- `data-ax-typer` (with `.t-line` / `.t-cmd` children) - terminal typing
- `data-ax-parallax` - image parallax inside a `<figure>`
- `data-ax-magnetic` - magnetic button

## Enable it

1. Install the libraries (only now do they enter your bundle graph):

   ```bash
   npm i three gsap lenis
   npm i -D @types/three
   ```

   > GSAP's ScrollTrigger, SplitText, and SplitText are part of the public GSAP
   > package. If you use GSAP's bonus/Club plugins, follow GSAP's install docs.

2. Move the components into the app so the `@/` alias resolves:

   ```bash
   cp extras/immersive/SiteFX.tsx src/components/site/SiteFX.tsx
   cp extras/immersive/HeroScene.tsx src/components/site/HeroScene.tsx
   ```

3. Append the styles to `src/app/globals.css`:

   ```bash
   cat extras/immersive/immersive.css >> src/app/globals.css
   ```

4. Mount `SiteFX` in the public layout `src/app/(site)/layout.tsx` (it must NOT
   be added to the admin layout):

   ```tsx
   import SiteFX from "@/components/site/SiteFX";
   // ...inside the returned fragment, near the top:
   <SiteFX />
   ```

5. (Optional) Use the WebGL hero. In a hero block's `Render`, give the section
   `position: relative` and drop the scene behind the content. Because the scene
   is a client component with `useEffect`, you can render it directly:

   ```tsx
   import HeroScene from "@/components/site/HeroScene";
   // ...
   <section className="cms-hero" style={{ position: "relative", overflow: "hidden" }}>
     <HeroScene />
     <div className="cms-container" style={{ position: "relative" }}>
       <h1 data-ax-chars>Your immersive headline</h1>
     </div>
   </section>
   ```

6. Typecheck and build:

   ```bash
   npm run typecheck && npm run build
   ```

## Theming note

`HeroScene.tsx` was tuned for a dark hero (its fragment shader mixes dark ink,
acid green, and cyan over a near-black fog). On Slim Minima's default light
theme it will look wrong. Adjust the `FRAG`/`VERT` shader colors and the
`scene.fog` color, or give the hero section a dark background, before shipping.

## Reverting

Delete the copied files from `src/components/site/`, remove `<SiteFX />` from the
site layout, remove the appended CSS block, and `npm uninstall three gsap lenis
@types/three`. You are back to the slim default.
