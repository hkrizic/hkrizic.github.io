# Hrvoje Krizic — website redesign

The redesign is integrated into `hkrizic.github.io`. Local development and preview use this checkout.

The redesigned pages are `index.html`, `research.html`, and `cellist.html`. Other pages, including teaching and Stringendo, remain available in this copy.

## Run locally

From this directory:

```sh
python3 -m http.server 4322 --bind 127.0.0.1
```

Open http://localhost:4322. No install or build is required.

## Design and interactions

- Physics leads: a live WebGL quadruply lensed quasar, blue host-galaxy arcs, a warm foreground lens galaxy, oversized typography, and a contrasting editorial biography. The four point images are solved from the same isothermal-sphere plus external-shear lens equation used to render the host. Source motion stays inside the four-image caustic. On phones, the full lens sits below the introduction; browsers without WebGL receive a static rendering of the same quad.
- Research starts with current work, publications and previous projects, followed by interactive explanations of arcs, lensed quasars and time delays. The quasar applet adapts the original `random/lensing_simulator.html` directly into the page: an elliptical power-law lens, a ray-traced Sérsic host, external shear, an optional satellite, and source/image views with caustics and critical curves. It supports dragging, touch, keyboard controls, five presets, and expandable model settings.
- Cello has a separate warm palette, performance photography, all 31 original 2026 concert entries, ticket links, an expandable archive, four videos, the SoundCloud recording, and all five press-photo downloads.
- English and German, mobile navigation, scroll reveals, cross-document transitions where supported, reduced-motion support, and a session-persistent animation pause control.
- Fonts and optimized display images are local. Original high-resolution press downloads remain intact. Video and audio embeds still require their external providers.

## Editing

Page content and translations are in the three HTML files. Shared styling and interactions are in `assets/redesign/site.css` and `assets/redesign/site.js`. The existing language helper is retained in `assets/i18n.js`.

The embedded quasar simulator uses `epl-model.mjs` for the lens equation and numerical calculations, `epl-worker.js` to perform them off the main thread, and `epl-simulator.js` for controls and canvas drawing. These files live in `assets/redesign/`. Calculation starts when the applet approaches the viewport; lens mappings are cached between source changes. The original standalone simulator remains available. The separate synthetic time-delay exercise uses `lensing.js` and `lensing-model.mjs`.

## Verification

Checked JavaScript syntax, local asset and cross-page anchor references, HTTP responses, preserved content counts, and the source copy against the original. The simulator's control IDs, labels, bilingual text, slider bounds and accessibility references were checked. The mobile-menu overlap was reproduced and fixed in headless Chrome. Checks covered all three pages after scrolling, two portrait sizes, a short landscape viewport, reduced motion, closing without losing scroll position, Escape, and switching to desktop. The corrected mobile menu was also inspected in a browser screenshot. Full simulator interaction testing and testing on physical iOS Safari remain to be done.

Run the numerical and worker checks with `node --test tests/epl-model.test.mjs` (Node.js required only for tests). Ten tests cover analytic circular-lens solutions, a shallow profile's central image, the EPL convergence, all presets at mobile and desktop resolutions, crossing a caustic, critical curves, a range of mass models, satellite effects, host brightness, and worker messages. Found image positions map back to the source within 10⁻⁷ arcseconds. This verifies the calculated roots; it does not guarantee that the numerical search resolves every extremely faint or nearly merged image for every parameter combination.

Physics reference: [The lensing equation, Dynamics and Astrophysics of Galaxies](https://galaxiesbook.org/chapters/III-04.-Gravitational-Lensing_1-The-lensing-equation.html).

The revised design uses plain section headings and sans-serif typography, with decorative numbering, figure labels, and slogans removed.

The Research page presents current work and an ALPACA I preprint entry before earlier projects. The “Explore gravitational lensing & lensed quasars” link leads to three examples at the bottom: extended-source arcs, the embedded EPL quasar simulator, and a synthetic light-curve alignment exercise.

The time-delay example has a unique exact alignment at 24 days. The simulations are explanatory models, not observations or cosmological measurements. The quasar applet uses a fixed brightness stretch and illustrative point markers; it does not simulate a telescope PSF or noise. Its strength parameter b follows the original EPL simulator's convention and equals the Einstein radius in the circular limit.

The visible “About the lens model” link opens the requested [Essentials of strong gravitational lensing PDF](https://arxiv.org/pdf/2401.04165v1). The EPL deflection implementation retains its technical attribution to [Tessore & Metcalf (2015)](https://arxiv.org/abs/1507.01819) in the source.

Publication metadata: https://arxiv.org/abs/2609.04312

The Publications entry now pairs a light bibliographic panel with a blue paper preview. `assets/redesign/images/alpaca-i-first-page.webp` is a local rendering of page 1 of https://arxiv.org/pdf/2609.04312 (retrieved 22 September 2026), rendered with Poppler and encoded as WebP. Both the paper preview and the reading button open the full PDF. Desktop hover/focus motion respects the motion toggle and reduced-motion preference. The layout, image loading, bilingual labels, links and hover behavior were checked in Chrome at desktop, tablet and phone sizes.

Homepage quad checks: `node --test tests/hero-quasar.test.mjs` verifies four distinct images and lens-equation residuals across 169 source positions. The WebGL shader, point uniforms, pointer limits and layout were checked in Chrome at desktop and phone widths. The homepage opts into this rendering with `data-lens="quad"`; the research arc demonstration retains its original model.
