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

- Home is a scroll-driven stage in black, white and one typeface (Mona Sans, variable width and weight). The intro is a light page with the name cut out of it; the sitting portrait (with its concrete wall) lies behind, so it is seen through the letters, and shifts against them with the pointer. On tall screens the two words run upwards in condensed type. Scrolling zooms into the stem of the "I" until the photograph fills the screen and turns from grey to colour, then fades to black. The physics scene is abstract: a small source spirals in behind a lens galaxy (singular isothermal sphere plus external shear, drawn in WebGL) and is seen as one, two, then four images, and finally an Einstein ring. The ring opens into a light disc that fills the screen and unrolls into four cello strings (C, G, D, A), seen along the fingerboard; they bow with the scroll speed, ring out when released, and can be plucked with the pointer or by tapping. Reduced motion replaces the zoom and flips with crossfades; without WebGL the lens scene is skipped.
- The quadruply lensed quasar rendering in `lens-sky.mjs` (quad mode) is no longer used on a page. It is rendered like a JWST colour composite: a de Vaucouleurs lens galaxy aligned with the mass model, a lensed host galaxy with star-forming clumps, quasar images with a chromatic PSF and six diffraction spikes, stars, background galaxies and sky noise, shown with an asinh stretch. Each image repeats the quasar's brightness changes after its own delay.
- Research and Cello use the same design as the home page: light and dark sections, one typeface, huge uppercase titles whose letters flip in as they scroll into view, blocks that rise into place, and no arrows or pills. The Research hero is dark: the pointer moves a source behind a lens (seen as two or four images), and scrolling lines it up into an Einstein ring that opens into the page. It then shows current work, the ALPACA I preprint (the paper tilts towards the pointer), earlier projects, and three interactive explanations in black and white: extended-source arcs (rendered like a telescope image), the embedded EPL quasar simulator (adapted from `random/lensing_simulator.html`; dashed caustic, solid critical curve, a cross for the source) and the time-delay exercise.
- The Cello hero is CELLO cut out of the page over the concert photograph (`Bild_2.jpeg`), zoomed through the first L on scroll, with the name running upwards on tall screens. It keeps all 31 concert entries, ticket links, the expandable archive, the biography, four videos, the SoundCloud recording and all five press-photo downloads. The line under each concert is a string that rings when the pointer crosses it; photos tilt towards the pointer.
- English and German, a phone menu, and reduced-motion support throughout. Big titles shrink until their longest word fits, so long German words never overflow.
- Fonts and optimized display images are local. Original high-resolution press downloads remain intact. Video and audio embeds still require their external providers.

## Editing

Page content and translations are in the three HTML files. `assets/redesign/mono.css` and `mono.js` hold the shared design (top bar, menu, flip-in titles, the name cut out of the page, the WebGL lens, the contact footer). The home page adds `home.css` and `home.js`; Research and Cello add `pages.css` and `pages.js`, and the research arcs demonstration is `lens-demo.js`. The home photograph is `assets/images/portrait.jpg` re-encoded as `home-portrait.webp` (and a 760 px version for phones); the cello hero is `Bild_2.jpeg` as `cello-hero.webp`. Names cut out of the page are drawn on a canvas once the web font has loaded.

The quad rendering and the research arcs demonstration share `assets/redesign/lens-sky.mjs`. It draws the static field (lens galaxy, stars, background galaxies, noise) once per canvas size into a texture and adds the lensed host and quasar images each frame. The no-WebGL fallbacks `quad-quasar-fallback.webp` and `arcs-fallback.webp` are renderings from the same module.

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

`assets/redesign/images/alpaca-i-first-page.webp` is a local rendering of page 1 of https://arxiv.org/pdf/2609.04312 (retrieved 22 September 2026), rendered with Poppler and encoded as WebP. Both the paper preview and the reading button open the full PDF.

Quad rendering checks: `node --test tests/hero-quasar.test.mjs` verifies four distinct images and lens-equation residuals across 169 source positions, and that every image repeats the same brightness curve after its own delay. The WebGL shader, point uniforms, pointer limits and layout were checked in Chrome at desktop and phone widths. A canvas opts into this rendering with `data-lens="quad"`; the research arc demonstration retains its original model.

Home checks: the scroll timeline, name cut-out and zoom, lens scene, portal, string morph and plucking were checked in headless Chrome (software WebGL) at 1440×900, 1920×1080, 2560×1080, 1180×820, 1024×768, 844×390, 768×1024 and 390×844, in English and German, with reduced motion and with WebGL disabled.


Research and Cello checks: the heroes, flip-in titles, the three applets (arcs drawn, simulator presets, 24-day alignment), string rows and tilts were checked in headless Chrome at 1440×900, 844×390 and 390×844, in English and German (no title wider than its column, no horizontal scrolling) and with reduced motion. The YouTube and SoundCloud embeds could not load in the test environment.