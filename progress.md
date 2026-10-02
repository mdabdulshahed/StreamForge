# StreamForge — Build Progress

Living log of the phased build. **Read this first** when resuming work in a new
session: it records what exists, what does not, and every decision that would
otherwise have to be rediscovered by reading the whole tree.

---

## Environment (important)

| Thing | Value |
| --- | --- |
| Node | **v24.19.0** via nvm — Angular 22 requires `^22.22.3 \|\| ^24.15.0 \|\| >=26`. The machine's default `node` is v16 and **will not work**. |
| Activate | `nvm use` (an `.nvmrc` pins 24.19.0) or `export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"` |
| Angular | 22.1.x, standalone + **zoneless** + signals |
| TypeScript | 6.0.x, `strict` + `strictTemplates` + `noUnusedLocals`/`noUnusedParameters` |
| Tailwind | **v4.3** via `@tailwindcss/postcss` (`.postcssrc.json`), no `tailwind.config.js` |
| Shaka Player | 5.2.4 — **integrated**, in `StreamingPlayerService`. See the type-shim note in Phase 3 below before touching its imports. |
| Tests | Vitest 4 through `@angular/build:unit-test` (`npx ng test`) |

Commands: `npx ng serve` · `npx ng build` · `npx ng test`

---

## Phase status

| # | Phase | Status |
| --- | --- | --- |
| 1 | App shell + routing + mock catalog | ✅ **Done** |
| 2 | HTML5 video element + custom controls | ✅ **Done** |
| 3 | Shaka Player integration | ✅ **Done** |
| 4 | HLS playback | ✅ **Done** |
| 5 | MPEG-DASH playback | ✅ **Done** |
| 6 | ABR + quality selection | ✅ **Done** |
| 7 | Playback analytics + diagnostics | ✅ **Done** |
| 8 | MSE capability detection + docs panel | ✅ **Done** |
| 9 | EME capability detection | ✅ **Done** |
| 10 | Optional DRM / Widevine config | ✅ **Done** |
| 11 | Network simulation tooling | ⬜ Not started |
| 12 | Performance / a11y / responsive polish | ⬜ Not started |
| 13 | README + architecture docs | ⬜ Not started |

---

## Phase 1 — App shell, routing, mock catalog ✅

### Verified

- `npx ng build` — clean, no warnings. Initial bundle **304 kB raw / 79 kB transfer**.
- `npx ng test` — **19 tests, all passing**.
- `npx ng serve` — serves 200 on `/`.
- Route-level code splitting confirmed in build output: `home`, `video-details`,
  `player-page`, `diagnostics-page`, `not-found` are each their own chunk.

Not verified: visual rendering in a real browser (no browser automation available
in this environment). Layout is built to spec but has not been eyeballed.

### Routes

| Path | Component | Notes |
| --- | --- | --- |
| `/` | `features/home/home.ts` | Hero + 5 rails + category grid |
| `/video/:id` | `features/video-details/video-details.ts` | `assetResolver` |
| `/player/:id` | `features/player/player-page.ts` | `assetResolver`; **shell only** |
| `/diagnostics` | `features/diagnostics/diagnostics-page.ts` | **shell only** |
| `/not-found` | `features/not-found/not-found.ts` | |
| `**` | → `/not-found` | |

All use `loadComponent` + `export default class`.

### Files created

```
.nvmrc                              Node pin
.postcssrc.json                     Tailwind v4 PostCSS entry
src/styles.css                      @theme tokens, base layer, .sf-* component classes
src/index.html                       meta, theme-color, non-blocking webfont
src/environments/
  environment.model.ts              Environment + DrmEnvironmentConfig + KEY_SYSTEM
  environment.ts                    dev: devtools on, DRM off
  environment.production.ts         prod: devtools off, DRM off
src/app/
  app.ts                            shell: header / router-outlet / footer
  app.config.ts                     zoneless CD, router w/ input binding + view transitions
  app.routes.ts                     lazy routes
  core/
    models/stream-source.model.ts   StreamSource, StreamProtocol, detectProtocol()
    models/video-asset.model.ts     VideoAsset extends StreamSource
    models/category.model.ts        Category, Collection, ContentRow
    models/index.ts                 barrel
    data/catalog.data.ts            14 assets, 7 categories, 5 collections
    services/catalog.service.ts     signal-based, API-shaped
    resolvers/asset.resolver.ts     :id → VideoAsset, 404 on miss
  layout/
    app-header/*                    fixed, transparent→frosted on scroll, mobile menu
    app-footer/*                    provenance notice
  shared/
    components/poster-art/          procedural duotone artwork
    components/video-card/          catalog tile
    components/content-rail/        native scroll-snap rail
    components/hero-banner/         full-bleed hero
    components/category-tile/       gradient genre tile
    components/skeleton/            shimmer block
    components/rail-skeleton/       rail-shaped loading state
    components/protocol-badge/      HLS / MPEG-DASH pill
    components/phase-placeholder/   honest "not built yet" panel
    pipes/duration.pipe.ts          'clock' | 'human'
  features/home | video-details | player | diagnostics | not-found
```

### Decisions worth remembering

**Zoneless change detection** (`provideZonelessChangeDetection`). A playing
`<video>` fires `timeupdate` several times a second; under Zone.js every one of
those would tick the whole application. Signals-only CD makes the media event
firehose in Phase 2 cheap by construction rather than something to optimise later.

**`VideoAsset extends StreamSource`.** The streaming layer consumes the small
`StreamSource` contract; merchandising metadata (cast, rails, match score) rides
along on the subtype. Any asset can be passed straight to the player service
without unwrapping, and the player never sees catalog concerns.

**Route resolver over in-component loading.** `assetResolver` resolves `:id`
before activation, so details/player declare `input.required<VideoAsset>()` — no
null checks, no loading branch in the template, and the components can be
rendered in isolation by passing an input. Unknown id → `/not-found`.

**Lazy everything.** Shaka is a large dependency and lands in the player chunk in
Phase 3. Someone browsing the catalog must not download a media engine.

**Procedural posters.** No licensed key art exists for fictional titles, and
hot-linked images rot. `PosterArt` derives a deterministic duotone from an FNV-1a
hash of the asset id — same title, same artwork, zero network requests, nothing
to 404. `poster?: string` on `VideoAsset` lets real images drop in later.

**Native scroll-snap rails, not a JS carousel.** Zero main-thread cost, real
momentum scrolling on touch, keyboard- and screen-reader-navigable for free. The
arrow buttons are `tabindex="-1"` + `aria-hidden` pointer sugar on top.

**Placeholders state the phase.** `/player` and `/diagnostics` render
`PhasePlaceholder`, which names what will exist and when. No invented metrics —
every number on the diagnostics page must be a real measurement, so the page
stays empty until there is something to measure.

**Tailwind v4 `@theme` tokens, no config file.** Tokens are declared in
`src/styles.css` and are usable both as utilities (`bg-ink-900`) and as raw CSS
variables from component SCSS (`var(--color-ink-900)`) — one source of truth
across both styling systems.

**Global styles are `.css`, component styles are `.scss`.** Sass cannot resolve
`@import "tailwindcss"`, so the Tailwind entry point is plain CSS; components
keep SCSS for nesting. `angular.json` sets `stylePreprocessorOptions.includePaths: ["src/styles"]`.

### Design tokens

`ink-*` surfaces (near-black, slight blue) · `mist-*` text · `ember-*` accent
(#ff6b2c, the "forge") · `violet-500` DASH · `ok-400` HLS/healthy · `live-500`
live badge · `warn-400` / `danger-400`. Gutter is one `--gutter` variable
stepping 1rem → 2rem → 3.5rem at 768/1280, so every section optically aligns.

### Content

14 fictional titles over **public demo streams only**: Shaka demo assets
(Angel One, Sintel, Heliocentrism), DASH-IF (Big Buck Bunny, livesim2),
Unified Streaming (Tears of Steel), Apple BipBop, Bitmovin, Mux, Akamai live.
Both an HLS and a DASH variant exist for several titles so protocols can be
compared side by side. `sourceCredit` on each asset surfaces provenance in the
UI; the footer repeats the notice site-wide.

A test asserts every asset's declared `type` matches its manifest extension, that
all manifests are HTTPS, and that `isLive` ⇔ `durationSeconds === null`.

### Accessibility done so far

Skip link · single tab stop per card with a descriptive `aria-label` · rails
labelled via `aria-labelledby` · one global `:focus-visible` treatment ·
`aria-expanded`/`aria-controls` on the mobile menu · skeletons `aria-hidden`
paired with an `sr-only` status message · `prefers-reduced-motion` honoured
globally · hover-only effects gated behind `@media (hover: hover)`.

### Known gaps

- No visual QA yet (no browser in this environment).
- `CategoryTile` links to `/#category-<id>` — an anchor jump, not a filtered
  route. A real category route is worth adding in Phase 12.
- No search UI; `CatalogService.search()` exists but nothing calls it.
- `Home.loading` is wired to the skeletons but never set true — it will be once
  the catalog moves behind a real async source.

---

## Phase 2 — HTML5 video + custom controls ✅

### Verified

- `npx ng build` — clean. `player-page` chunk is now **20.46 kB raw / 6.04 kB
  transfer** (was 2.26 kB in Phase 1's shell). Initial bundle unaffected —
  everything here is still behind the lazy route.
- `npx ng test` — **27 tests, all passing** (8 new, covering the
  `derivePlaybackState` state machine).
- `npx ng serve` — `/` and `/player/:id` both serve 200.

Not verified: real playback in a browser (no browser automation available in
this environment). The demo source is a well-known public MP4
(`BigBuckBunny.mp4` from Google's public sample bucket); URL correctness has
not been eyeballed by actually watching it play.

### What was built

Deliberately **no Shaka yet** — this phase proves the native
`HTMLMediaElement` pipeline and a fully custom control surface on a plain
progressive MP4, so it is unambiguous exactly which layer Shaka Player
replaces when it arrives in Phase 3.

```
src/app/core/
  models/media-event.model.ts     MEDIA_EVENT_NAMES, PlaybackState, BufferedRange,
                                   derivePlaybackState() — pure state-transition fn
  models/media-event.spec.ts      8 tests over the state machine
  services/media-events.service.ts  MediaEventsService — the one place all 16
                                   native events are listened to
src/app/features/player/
  components/video-surface/video-surface.ts   owns the <video> element only
  components/control-bar/control-bar.ts       presentational controls
  components/control-bar/control-bar.html
  components/control-bar/control-bar.scss
  player-page.ts / .html / .scss              wires the two together
```

**`MediaEventsService`** is provided at `VideoSurface`'s component level (not
root) — playback state is per `<video>` element, and Angular destroys the
service automatically (running its `ngOnDestroy`, which detaches listeners)
when the component is torn down. It listens to exactly the 16 events from
spec section 9 and folds them into a small set of signals: `state`,
`currentTime`, `duration`, `buffered`, `volume`, `muted`, `playbackRate`,
`error`.

**`derivePlaybackState`** is the state-transition logic pulled out as a pure
function — `(previousState, eventName, {paused, ended}) → nextState` — so it
is unit-testable without a real `<video>` element. This mattered because
jsdom's `HTMLMediaElement` doesn't implement enough of the real media
pipeline to drive `MediaEventsService` through actual playback in a test
(`duration` has no setter, `play()` is unimplemented), so DOM-level tests
would have been unreliable. The pure function is where the actual logic
lives and is what's tested; the service itself is thin listener-wiring glue.
Priority order: `error` > `ended` > `seeking` > `waiting`/`stalled` (only
"buffering" if it interrupts active playback — a stall while paused is not) >
"is the element paused" > the triggering event.

**`VideoSurface`** owns the `<video>` element and nothing else: an `effect()`
reacts to the `src` input and to the `viewChild` signal resolving (which
happens once the view initializes), attaches `MediaEventsService` on first
resolution, and keeps `video.src` in sync thereafter. It exposes imperative
methods (`play`, `pause`, `togglePlay`, `seekTo`, `seekBy`, `setVolume`,
`toggleMute`, `setPlaybackRate`) for a parent to call, and the public
`events` property for a parent to read state from.

**`ControlBar`** is purely presentational — no DOM access, no player logic.
Every action is an `output()`; every value is an `input()`. This is what
makes it reusable unmodified once Shaka replaces the native source in Phase
3: it only ever talks to `VideoSurface`'s method surface, never to
`HTMLMediaElement` directly. Built: play/pause with a buffering spinner,
a scrubber (single range input with buffered/played/remaining painted via a
computed CSS gradient, rather than layering separate divs behind a
transparent input), volume + mute, a playback-speed `<select>`
(0.5×–2×), and a working fullscreen toggle. Captions and quality/settings
buttons are present but **disabled with an explanatory `title`** — captions
have no track to attach yet, quality has no rendition ladder until Phase 6.
This follows the same "state the phase, don't fake it" rule as the
`PhasePlaceholder` component from Phase 1.

**`PlayerPage`** wires it together: a `player-shell` container holds
`VideoSurface` and `ControlBar` (absolutely positioned, pinned to the
bottom). Auto-hide is a `signal<boolean>` armed by an `effect()` watching
`state()` — controls stay lit in every state except active playback, hide
after 2.6s of no pointer/keyboard activity, and reappear immediately on any
interaction. Fullscreen targets the shell container (not just the `<video>`
element), so the custom controls stay visible and functional in fullscreen —
tracked via a native `fullscreenchange` listener rather than assuming the
request always succeeds. Keyboard shortcuts are bound on the shell
(`space`/`k` play-pause, `←`/`→` seek ±5s, `↑`/`↓` volume ±5%, `m` mute,
`f` fullscreen), guarded so they don't fire while focus is inside the rate
`<select>`.

### Decisions worth remembering

**One shared demo MP4, not per-title.** The catalog's `manifestUrl` values
are all `.m3u8`/`.mpd` — neither is playable by a plain `<video src>` in most
browsers (only Safari has native HLS; DASH needs a manifest parser
regardless). Rather than showing a broken/erroring player as the Phase 2
deliverable, or quietly faking success, the player page uses one clearly
public-domain MP4 and says so in an on-page banner: *"Playing a public sample
video... not {title}'s real stream."* This stays honest to the "no fake
playback" rule while still proving the control surface end to end. The
per-title manifest URL takes over the moment Shaka is wired in.

**Pure function for the state machine, not a class with mutable state.**
Made the trickiest logic in this phase (event → state folding) testable in
isolation and reviewable as a truth table, independent of whether it's ever
wired to a real element correctly.

**Fullscreen on the shell, not the `<video>`.** A common mistake is calling
`requestFullscreen()` on the video element itself, which either hides custom
controls entirely or requires re-parenting them into the fullscreen element.
Requesting fullscreen on the container they already share avoids both.

### Known gaps

- No real playback has been visually verified (no browser in this
  environment) — only that the routes serve and the app compiles/type-checks
  under `strictTemplates`.
- The scrubber seeks immediately on `input` (no separate "preview while
  dragging, commit on release" mode). Acceptable for Phase 2; worth
  reconsidering once real network-backed seeking (Phase 3+) makes scrub cost
  more than a local MP4 does.
- No autoplay — `play()` requires a user gesture (clicking the play button),
  which is the correct, standards-compliant behavior, not a gap to fix.
- Volume slider is hidden below `640px` (icon + tap-to-mute only) to keep the
  control bar from crowding on mobile; revisit in Phase 12's responsive pass.

---

## Phase 3 — Shaka Player integration ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors, including through
  Shaka's Closure-generated types.
- `npx ng build` — clean, **zero warnings** (the CJS bailout warning is
  explicitly silenced — see below). `player-page` chunk is now
  **837.57 kB raw / 224.19 kB transfer** (Shaka Player itself), still fully
  lazy — the initial bundle is unchanged at 310.57 kB raw / 80.97 kB transfer.
- `npx ng test` — still **27 passing** (no new tests this phase; nothing
  added here is unit-testable without a real browser — see Known gaps).
- `npx ng serve` — `/` and `/player/:id` both serve 200, dev-server rebuild
  is clean.

Not verified: actual playback of a real HLS/DASH stream in a browser (no
browser automation in this environment). This is the biggest open risk of
the phase — see Known gaps.

### ⚠️ Read this before touching any Shaka import

Getting `import ... from 'shaka-player'` to type-check took three attempts
and is **not obvious from Shaka's own docs**. Recorded here so it isn't
re-derived (or re-broken) next session:

- Shaka's `package.json#types` points at `dist/shaka-player.compiled.d.ts`,
  a Closure-compiler-generated file.
- It looks like it declares everything as an ambient **global** namespace
  (`declare namespace shaka { class Player ... }`, no top-level `export`) —
  which would normally mean `import * as shaka from 'shaka-player'` resolves
  to an *empty* module type, since global ambient declarations don't attach
  to a module's exports.
- **But the file's last line is `export default shaka;`** — that single
  statement makes the *entire file* a real ES module, so every
  `declare namespace shaka {...}` block in it is actually module-scoped, not
  global, and rolls up into that default export correctly.
- The fix is therefore the simplest possible one: a plain default import,
  used for **both** runtime values and type positions —
  ```ts
  import shaka from 'shaka-player';

  const player = new shaka.Player();          // value
  function onError(e: shaka.util.Error) {}     // type
  ```
  No shim, no ambient module override, no triple-slash reference. (Two
  earlier attempts — `import * as shaka` and a custom `declare module
  'shaka-player'` shim — both failed for instructive reasons: the former
  gets an empty module type because a *namespace* import doesn't merge with
  Shaka's *default* export; the latter's own `declare module` block
  overrides normal resolution for that specifier, which stops TypeScript
  from ever loading the real `.d.ts` at all. Neither is needed.)
- `angular.json`'s build options now include
  `"allowedCommonJsDependencies": ["shaka-player"]` — Shaka's compiled
  bundle is a UMD/CJS build, and esbuild warns about that by default
  ("optimization bailouts"). The warning is cosmetic for a lazy-loaded route
  like this one; the flag just silences it.

### What was built

```
src/app/core/
  models/quality-track.model.ts   QualityTrack, qualityLabel() — our own
                                   shape, not Shaka's wider Track type
  models/player-error.model.ts    PlayerErrorInfo — normalised error shape
  services/streaming-player.service.ts   StreamingPlayerService
```

**`StreamingPlayerService`** — provided at `VideoSurface`'s component level
(one Shaka `Player` per `<video>` element, same pattern as
`MediaEventsService`; Angular auto-destroys it, running `destroy()`, when
the surface is torn down). Implements every responsibility spec section 4
lists, in the following shape:

- `attach(video)` — installs Shaka's browser polyfills exactly once
  (module-level guard, not per-instance), checks
  `shaka.Player.isBrowserSupported()` and reports a real `CRITICAL` error if
  not, then constructs the player and wires its `error`/`trackschanged`/
  `adaptation` events.
- `load(manifestUrl)` / `unload()` / `destroy()` — manifest lifecycle,
  each updating `loading`/`manifestUrl`/`protocol`/`isLive`/`tracks` signals.
- `selectTrack(track)` / `enableAbr()` — manual quality pinning (disables
  ABR first, per spec section 15) and re-enabling it. Built now since it's
  genuinely Shaka-specific and small; **not exposed in any UI yet** — the
  visible quality menu is Phase 6. This mirrors the Phase 1 "state the
  phase, don't fake it" rule from the other direction: the capability
  existing early is fine, showing it before it's real functionality
  wouldn't be.
- `getBufferedInfo()` — thin wrapper for Phase 7's diagnostics to call.
- `error` signal — every error is `shaka.util.Error`'s own `code`/
  `category`/`severity`, converted via Shaka's own enums
  (`shaka.util.Error.Category[code]`, `...Severity[code]`), never invented.

**Deliberately not on this service:** `play()`, `pause()`, `seek()`,
`setVolume()`, `setPlaybackRate()` — despite spec section 4 listing them.
Shaka does not intercept native playback controls; it only manages *what*
the `<video>` element is fed via MSE. `VideoSurface` already implements all
five directly against the native element (Phase 2) and continues to,
unchanged. Duplicating pass-through methods here would be a redundant hop
to the same native call with no behavioural difference — see the comment
block at the top of `streaming-player.service.ts` for the fuller argument.

**`VideoSurface`** changed minimally: its `src: string` input became
`manifestUrl: string`, and the constructor `effect()` now does
`player.attach(video).then(() => player.load(url))` on first resolution
instead of `video.src = url`. A plain instance field (`lastRequestedUrl`,
not a signal) tracks what was last requested, specifically so the effect
doesn't depend on `player.manifestUrl()` — reading that signal inside the
same effect that also *writes* it (transitively, via `load()`) would make
the effect re-run on its own write. All five imperative control methods are
untouched.

**`PlayerPage`** now loads `asset().manifestUrl` — the title's real stream
— instead of Phase 2's shared demo MP4. Added: a protocol badge showing
`player.protocol()` (the *detected* protocol from the loaded manifest, not
just the catalog's declared `type`, falling back to the catalog value while
still loading); a live badge when `player.isLive()`; a loading overlay
(`player.loading()`) with a spinner; and an error overlay
(`player.error()`) showing the user-facing message plus the real Shaka
error code/category/severity — a small, honest preview of spec section 16
ahead of its own phase, made necessary by the fact that these public demo
manifests can now genuinely fail to load (stale URL, CORS, moved asset) and
silently showing nothing would be worse than showing what Shaka reported.

### Decisions worth remembering

**Default import, not namespace import, for Shaka.** See the callout above
— this is the one thing most likely to trip up future edits to this file.

**Quality selection built but not wired to any control.** `selectTrack`/
`enableAbr`/`tracks`/`activeTrack` all work today; nothing in the UI calls
them. This is intentional scoping, not an oversight — Phase 6 is where the
quality menu (and the "Auto ✓" / manual-disables-ABR UX from spec section
15) actually gets built and tested against it.

**Error overlay added ahead of its own phase.** Full error-handling depth
(user-friendly categorization, retry affordances, the complete taxonomy
from spec section 16) is not a numbered phase on its own — it's threaded
through several. A minimal, honest version was necessary *now* because
Phase 3 is the first point real network requests can fail, and the
alternative (silently showing a black box) would be worse than the app
being incomplete.

### Known gaps

- **No real playback has been visually verified in a browser.** This
  phase's biggest risk: several catalog manifest URLs are years-old public
  demo endpoints (Shaka demo assets, DASH-IF reference streams, Bitmovin/
  Mux/Akamai public test streams) and any of them could now 404, have
  moved, or hit CORS restrictions that only surface at the browser network
  layer — none of which `tsc`/`ng build`/`ng test` can catch. If a title
  fails to load, the new error overlay should at least show *why*
  (Shaka's real error code) rather than a blank black rectangle — but which
  titles work has not been confirmed. **Next session, load `/player/:id`
  for a few catalog entries in a real browser before building further on
  top of specific ones**, and swap out any that have gone stale.
- No DOM/browser-level tests for `StreamingPlayerService` — same jsdom
  limitation noted in Phase 2 (jsdom's `HTMLMediaElement`/`MediaSource`
  support is too thin to drive real Shaka playback in a test), compounded
  by Shaka needing actual MSE. Verification for this phase is
  build/type-check plus (pending) manual browser testing, not unit tests.
- `getBufferedInfo()` and the track-selection methods are unexercised code
  paths until Phase 6/7 call them — real risk of an API mismatch surfacing
  only then rather than now.

---

## Phase 4 — HLS playback ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. `player-page` chunk is now
  **839.28 kB raw / 224.34 kB transfer** (+~1.7 kB over Phase 3, for the
  caption-track plumbing — negligible next to Shaka itself).
- `npx ng test` — still **27 passing**.
- `npx ng serve` — `/player/signal-and-noise` (HLS) and
  `/player/chromatic-drift` (DASH) both serve 200.

Not verified: whether `signal-and-noise` (Apple's BipBop advanced example)
actually exposes a WebVTT track the way its filename/reputation implies, or
whether the captions toggle visibly does anything in a real browser. See
Known gaps — this carries the same unverified-playback risk flagged in
Phase 3, now extended to the caption-selection logic specifically.

### What was built

Since Shaka's `load()` already parses HLS transparently (Phase 3 — there is
no protocol-specific loading path to add), this phase's real content was
picking the one HLS-specific capability with an existing UI hook and making
it real: **captions**.

```
src/app/core/
  models/caption-track.model.ts       CaptionTrack — mirrors shaka.extern.TextTrack
  services/streaming-player.service.ts  + captionTracks/activeCaptionTrack
                                         signals, selectCaptionTrack()
src/app/features/player/
  components/control-bar/control-bar.ts/.html/.scss   captions button: real toggle
  player-page.ts/.html                                 wiring + 'c' keyboard shortcut
```

**`StreamingPlayerService`** gained `captionTracks`/`activeCaptionTrack`
signals and `selectCaptionTrack(track | null)`. Populated once per `load()`
via a new `refreshCaptionTracks()` — deliberately *not* hooked to the
`trackschanged`/`adaptation` events the way quality tracks are, since text
tracks are static per manifest; nothing changes them mid-playback the way
ABR changes the active variant. Selection maps to Shaka's actual API
surface for this version (5.2.4): there is **no separate visibility
toggle** (`isTextTrackVisible`/`setTextTrackVisibility` do not exist on
`shaka.Player` in this release, despite appearing in older
docs/tutorials) — `selectTextTrack(track)` both selects and shows,
`selectTextTrack(null)` hides. Confirmed by grepping the actual shipped
`.d.ts` rather than assuming from memory, the same discipline Phase 3's
type-shim investigation established.

**`ControlBar`**'s captions button changed from permanently disabled to a
real toggle: disabled (with an explanatory tooltip) only when
`captionTracks().length === 0`; otherwise clickable, with pressed state
reflected via `aria-pressed` and an ember-colored active style. The
component's `hasCaptions: boolean` input was **removed** — replaced by
deriving everything from the live `captionTracks`/`activeCaptionTrack`
inputs, so there is exactly one source of truth for whether captions are
available, and it's the real one.

**`PlayerPage`** wires the toggle (turns the first available track on, or
off if one is already active — the common single-track case), and adds
`c` to the keyboard shortcut map alongside space/k, arrows, m, f.

### Decisions worth remembering

**`hasCaptions` on `VideoAsset` was *not* reconciled with live detection —
it was superseded for this purpose.** The catalog flag remains as
pre-playback declarative metadata (used on the video-details page, where
nothing has loaded yet and there's nothing else to ask). Once a title is
actually loaded, the `ControlBar` captions button now asks
`StreamingPlayerService` directly rather than trusting the catalog's
guess — matching spec section 7's "do not fake the values... use actual
information exposed by the player where possible" applied to captions,
not just bitrate/resolution.

**Simple on/off toggle, not a multi-track language menu.** Real
multi-language subtitle selection needs a picker UI with a similar shape to
Phase 6's quality menu (list, checkmark, selection state) — building that
in isolation now, before Phase 6 establishes the pattern, would mean either
duplicating that UI shape or building it twice. A toggle correctly handles
every catalog title today (each has at most one caption track) and is
honest about what it does.

**Alternate audio renditions and I-frame playlists (trick-play) were
explicitly scoped out**, not overlooked. Both are real HLS-specific
features `shaka.extern.AudioTrack`/thumbnail APIs support, but neither has
an existing UI hook the way captions did via the already-built (if
disabled) button, and audio-track objects have no `id` field — unlike
variant/text tracks, `selectAudioTrack` takes the whole extern object,
which would mean storing raw Shaka objects in a signal, a different shape
than every other track type in this codebase. Deferred rather than
half-built; worth revisiting alongside Phase 6's settings-menu work if
there's appetite, but noting it here so it isn't silently forgotten.

### Known gaps

- **Still no real-browser verification** — same caveat as Phase 3, now
  extended to captions specifically: whether `signal-and-noise` genuinely
  surfaces a text track through Shaka (vs. Apple's example having changed
  over the years, or Shaka needing extra config to parse embedded WebVTT
  from an HLS playlist) is unconfirmed. **Next session, check the captions
  button is enabled (not greyed out) on `/player/signal-and-noise`** in an
  actual browser — that's the one-glance signal this phase worked.
- No unit tests added this phase — same jsdom/MSE limitation as Phase 2/3;
  `selectCaptionTrack`'s logic is a thin, low-branching wrapper around
  Shaka calls rather than something with independently interesting logic
  to isolate (unlike `derivePlaybackState`, which earned its own pure
  function specifically because its branching was non-trivial).
- Audio-language selection and I-frame trick-play remain unbuilt (see
  above) — flagged here so Phase 13's "Known limitations" section has
  something concrete to point at rather than a vague gap.

---

## Phase 5 — MPEG-DASH playback ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. `player-page` chunk essentially
  unchanged (839.41 kB raw / 224.50 kB transfer, +0.13 kB over Phase 4).
- `npx ng test` — **31 passing** (4 new — `clampSeekTarget`'s full
  behavior: VOD range, live DVR window, ±Infinity, NaN).
- `npx ng serve` — `/player/orbit-24` (live DASH) and
  `/player/heliocentric` (multi-period DASH) both serve 200.

Not verified: whether Shaka actually stitches `heliocentric`'s periods into
one seekable timeline, or whether `orbit-24`'s DVR window behaves as
expected, in an actual browser. Same standing caveat as the last two
phases — see Known gaps.

### What was built

Like Phase 4, DASH itself needed no new loading code — Shaka's `load()` has
been parsing every DASH title in the catalog since Phase 3. What Phase 3
got *wrong* for DASH specifically was seeking: `VideoSurface.seekTo`
clamped against the native `<video>` element's `duration`, which is
`[0, duration]` for VOD but unreliable (frequently `Infinity`) for live
content — and, more importantly, **wrong** for live DASH's defining trait:
a rolling DVR window whose *start* is not zero. A stream like `orbit-24`
only keeps a recent slice of its timeline available; clamping a seek to
`[0, duration]` would let the UI request a seek to content that has already
aged out of the manifest.

```
src/app/core/
  models/seek.model.ts     clampSeekTarget(target, range) — pure function
  models/seek.spec.ts      4 tests: VOD, live DVR window, ±Infinity, NaN
  services/streaming-player.service.ts   + getSeekRange()
src/app/features/player/
  components/video-surface/video-surface.ts   seekTo() now clamps against
                                               Shaka's real seek range first
```

**`StreamingPlayerService.getSeekRange()`** wraps `player.seekRange()`,
returning `null` only when no player exists yet (not when nothing has
loaded — Shaka's own contract is to return `{0, 0}` in that case, which
clamps any seek to a harmless 0, matching prior behavior).

**`clampSeekTarget`** is a small pure function — same reasoning as
`derivePlaybackState` in Phase 2: the one piece of genuinely branching
logic in this phase, pulled out so it's independently testable without a
real seekable element. `Math.min(Math.max(target, range.start), range.end)`
handles `+Infinity`/`-Infinity` correctly on its own (clamping to the
respective edge with no special-casing needed) — only `NaN` breaks
`Math.min`/`Math.max` (any comparison against `NaN` is `false`, so it
propagates through untouched), which is why that's the only case requiring
an explicit guard.

**`VideoSurface.seekTo`** now asks `player.getSeekRange()` first and, when
a player exists, clamps against that instead of `video.duration` — falling
back to the old duration-based clamp only in the (effectively unreachable
post-Phase-3) case where no player has been attached at all. `seekBy`
inherits this for free, since it already delegates to `seekTo`.

### Decisions worth remembering

**This was a correctness fix to existing behavior, not a new feature.**
Nothing changed for VOD titles — Shaka's `seekRange()` returns
`[0, duration]` there, identical to what the native-duration clamp already
did. The fix only changes behavior for live content, where it was
previously wrong.

**A "jump to live" button was considered and deferred.** It's the
canonical live-streaming affordance and would have made this phase's DASH
work more visible in the UI, but implementing it needs to know "how far
behind the live edge is playback right now" — and neither Shaka nor the
native `<video>` element fires an event when a live DVR window slides
forward; the only way to track that is polling on an interval. That's
exactly the pattern `environment.diagnosticsPollIntervalMs` exists for and
Phase 7 will establish — building a one-off polling loop here, before that
pattern exists, risks a shape that gets thrown away and rebuilt. Deferred
for the same reason Phase 4 deferred audio-language selection: a real gap,
not an oversight, and worth revisiting once Phase 7 lands.

### Known gaps

- **Still no real-browser verification.** Same standing caveat as Phases
  3–4. Specifically for this phase: whether `heliocentric`'s multi-period
  structure actually plays as one continuous seekable timeline, and whether
  `orbit-24`'s live DVR window is wide enough to meaningfully demonstrate
  the new clamping behavior, are both unconfirmed. **Next session, load
  both in a real browser** — for `orbit-24` specifically, try seeking to
  time `0`; before this phase it might have silently sought into empty
  buffer and stalled, after this phase it should clamp to the window start
  instead.
- "Jump to live" is deferred to (at the earliest) Phase 7 — see above.
- No change was needed to protocol detection or the live/protocol badges —
  they were already generic across HLS/DASH since Phase 3, so DASH-specific
  titles were already badging correctly. Worth confirming visually
  alongside the seek-range check above, but not expected to be broken.

---

## Phase 6 — ABR + quality selection ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. **Initial bundle: 310.60 kB raw /
  80.90 kB transfer — unchanged from Phase 5's baseline** (see the
  `DecimalPipe` note below for why this needed a second pass to hold).
  `player-page` chunk: 844.12 kB raw / 225.53 kB transfer (+4.7 kB over
  Phase 5, for the quality-menu UI).
- `npx ng test` — **38 passing** (7 new: `qualityLabel` and
  `distinctQualityLevels`).
- `npx ng serve` — `/player/meadowlight` (the catalog's 15-rung ladder,
  chosen specifically to exercise this phase) serves 200.

Not verified: whether quality switches are visually confirmable on
`meadowlight` in a real browser, or whether the popover menu positions and
dismisses correctly. Standing caveat, same as every phase since 3.

### What was built

As predicted in Phase 5's planning note, the hard part was already done —
`StreamingPlayerService.tracks`/`.activeTrack`/`.abrEnabled`/
`.selectTrack()`/`.enableAbr()` have existed, unwired, since Phase 3. This
phase was almost entirely UI work against data that already functioned.

```
src/app/core/models/
  quality-track.model.ts    + distinctQualityLevels() — dedupes variants
                             sharing a resolution down to one menu row
  quality-track.spec.ts     7 tests: label formatting, dedup, sort, edge cases
src/app/features/player/
  components/control-bar/control-bar.ts/.html/.scss
    quality gear button: disabled placeholder → real popover menu
  player-page.ts/.html      wiring + live quality/bitrate chip
```

**`distinctQualityLevels`** — pure function, same discipline as
`derivePlaybackState`/`clampSeekTarget`: a manifest can carry several
variants at one resolution (most often alternate audio paired with the same
video rendition), and spec section 15 asks for "only qualities actually
available" — one row per resolution a user can meaningfully choose, not one
per underlying audio+video combination. Keeps the highest-bandwidth variant
as each resolution's representative, sorted highest-first.

**`ControlBar`**'s quality button changed from permanently disabled to a
real popover menu — same "existing disabled affordance → working feature"
pattern Phase 4 used for captions. "Auto" always appears first, its label
showing the currently-resolved resolution (`Auto · 1080p`) so choosing Auto
doesn't feel like choosing nothing. Selecting a specific resolution or Auto
both close the menu and emit `selectQuality` (`QualityTrack | null`, `null`
= Auto) for the caller to apply. The popover dismisses via a
`position: fixed` backdrop nested inside the component (covers the full
viewport for outside-click dismissal without needing a `document`-level
listener) and via Escape, matching the existing "no global listeners"
discipline established for the auto-hide/keyboard-shortcut logic already in
`PlayerPage`.

**`PlayerPage`** wires `selectQuality` to the two existing `player` methods
(`enableAbr()` for `null`, `selectTrack()` otherwise — spec section 15's
"manual selection disables ABR" was already true, since `selectTrack` has
called `configure('abr.enabled', false)` since Phase 3) and adds a live
quality/bitrate chip next to the protocol/live badges, visible during
playback rather than buried in a future diagnostics-only view — spec
section 7 asks for this explicitly ("make ABR visible to the user").

### Decisions worth remembering

**`DecimalPipe` was tried, then deliberately removed.** Using
`{{ value | number:'1.1-1' }}` for the Mbps display pulled `@angular/common`
sufficiently to grow the **initial** bundle by ~5.8 kB raw, even though the
pipe was only ever used inside the lazy `player-page` chunk — Angular's
build hoisted the shared i18n/locale formatting machinery into `main`
rather than the lazy chunk. Replaced with a five-line `formatMbps()`
function (`(bits / 1_000_000).toFixed(1)`), mirroring the `formatClock`
precedent already in `control-bar.ts`. Worth remembering as a general
caution: a pipe that looks free because it's used in "just one lazy route"
is not always free — check the *initial* bundle size, not just the lazy
chunk's, after adding one.

**The "Auto" row shows the resolved resolution, not just the word "Auto".**
A pure "Auto" label with no other information means a user selecting it
can't tell what it actually did. `Auto · 1080p` — sourced from the same
`activeTrack` signal already driving the top-of-page chip — answers that
for free.

**Estimated bandwidth and buffer duration were deliberately left out of
the live indicator**, even though spec section 7 lists them alongside
quality/bitrate. Both require Shaka's `getStats()`, which has no change
event — it's a snapshot method meant to be polled (confirmed by grepping
the `.d.ts`: no `bandwidthestimatechanged` event exists). Current
quality/bitrate needed none of that — `activeTrack` already updates
reactively via the `adaptation`/`trackschanged` listeners wired in Phase 3.
Building a one-off poll loop here would preempt Phase 7, which exists
specifically to establish that pattern (`environment.diagnosticsPollIntervalMs`
has been sitting unused in config since Phase 1 for exactly this). Same
reasoning that deferred "jump to live" in Phase 5 and audio-track selection
in Phase 4 — a running list of real, intentional gaps, not oversights.

### Known gaps

- **Still no real-browser verification.** Specifically this phase: whether
  `meadowlight`'s ladder actually produces a visible quality switch during
  playback, and whether the popover's `position: fixed` backdrop correctly
  intercepts outside clicks without blocking the video's own pointer
  handlers. **Next session, load `/player/meadowlight`, open the quality
  menu, and confirm:** the backdrop dismisses on outside click, Escape
  closes it, and picking a resolution actually pins it (the top chip should
  stop showing `AUTO`).
- Estimated bandwidth, buffer duration, and "jump to live" all remain
  explicitly deferred to Phase 7 — see above.
- No audio-language selection still, per Phase 4's original deferral —
  unchanged this phase, noted here only so it isn't lost track of.

---

## Phase 7 — Playback analytics + diagnostics ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. **Initial bundle: 307.23 kB raw /
  80.52 kB transfer** — slightly *smaller* than Phase 6's baseline (removing
  the now-fully-superseded `PhasePlaceholder` component more than offset
  the new diagnostics route's own code). `player-page` chunk: 845.74 kB raw
  / 225.58 kB transfer (+1.6 kB — the diagnostics panel toggle; the bulk of
  `DiagnosticsDashboard` itself loads with `diagnostics-page`, now a real
  1.76 kB chunk instead of a near-empty placeholder).
- `npx ng test` — **63 passing** (16 new, all for the analytics reducer +
  the new `bufferAheadSeconds`/`readNetworkInfo`/`formatMbps` helpers).
- `npx ng serve` — `/player/chromatic-drift` and `/diagnostics` (with no
  active session) both serve 200.

Not verified: whether the dashboard's live numbers actually look sane
against real playback, whether the diagnostics panel toggle inside the
player renders correctly alongside the control bar, or whether leaving
`/diagnostics` empty-by-default (see the architecture decision below) reads
as intentional rather than broken to someone encountering it cold. Standing
caveat, now extended to a fourth thing worth checking in a browser.

### The architecture question from Phase 6, resolved

Phase 6 flagged a real problem: `/diagnostics` is a different route than
`/player/:id`, so it has no built-in way to reach whichever player is
currently active. Two shapes were on the table — (a) promote the whole
player to a route-independent singleton so it survives navigation (a
persistent mini-player, the way Spotify/YouTube-style apps do it), or (b)
keep the player exactly as component-scoped as it's always been, and give
diagnostics a lightweight way to reach it *while it's mounted*, accepting
that navigating away stops playback.

**Went with (b).** Option (a) is a legitimate pattern but a substantial,
separate piece of architecture — moving `VideoSurface` out of the routed
`PlayerPage` into the app shell, building a persistent mini-player bar,
rethinking what "the player page" even means. Attempting that as a
sub-part of "Phase 7: diagnostics" risked destabilizing everything built
in Phases 2–6 for a benefit the spec doesn't actually demand (it lists
`/diagnostics` as a page with certain fields; it never requires playback to
survive navigating away from it).

```
src/app/core/services/playback-session-registry.service.ts
  PlaybackSessionRegistry — providedIn: 'root'. Holds signal<PlaybackSession | null>.
  PlaybackSession bundles { assetId, assetTitle, events, player, analytics }
  — references to VideoSurface's already-component-scoped service instances.
```

`PlayerPage` registers its session on mount, deregisters on destroy
(guarded so a stale unmount can't clear a *newer* session — relevant if
Angular ever reuses this component instance across param changes, which it
already does for same-route title changes). `/diagnostics` reads the
registry: real dashboard when something's registered, an honest "No active
playback session" empty state — with a link back to the catalog — when
not. Navigating from `/player/:id` to `/diagnostics` **does** stop
playback, same as it always would with no player service. That's a real,
stated limitation, not a silently-accepted one.

What makes this actually useful despite that: `DiagnosticsDashboard` was
built as a **standalone, reusable component** (takes a `PlaybackSession |
null` input, owns nothing route-specific) rather than baked into the
`/diagnostics` route. `PlayerPage` got its own "Diagnostics" toggle that
renders the *same* component in place, sourced directly from its own
`session` computed signal — no registry indirection needed there, since
the data's already in scope. That's the practical way to see live
diagnostics while actually watching something, which is what most of the
value here is.

### What was built

```
src/app/core/models/
  playback-metrics.model.ts   PlaybackMetrics, AnalyticsState, 4 pure reducers
  playback-metrics.spec.ts    16 tests over every transition
  media-event.model.ts        + bufferAheadSeconds() (+ its own tests)
  network-info.model.ts       readNetworkInfo() — Network Information API, optional
src/app/core/services/
  playback-analytics.service.ts       thin glue: watches events/player, folds through reducer
  playback-session-registry.service.ts  root-scoped session pointer (above)
  streaming-player.service.ts         + getStats() — Shaka's own stats, snapshot-only
src/app/shared/
  utils/format.ts              formatClock/formatMbps, extracted from 3 near-duplicate copies
  components/diagnostics-dashboard/   the dashboard itself — Playback/Network/Performance/Stream
src/app/features/
  player/player-page.ts/.html  session registration, diagnostics toggle + panel
  diagnostics/diagnostics-page.ts     registry-backed route, empty state
```

**`PlaybackAnalyticsService`** follows the exact shape established by
`MediaEventsService`+`derivePlaybackState` and `StreamingPlayerService`'s
own internals: all the actual branching logic lives in pure reducer
functions (`reduceOnLoadStart/Complete`, `reduceOnStateChange`,
`reduceOnQualitySwitch`) operating on one plain `AnalyticsState` object;
the service is thin `effect()`-based glue that calls them when its sibling
services' signals change. This is the fourth time this shape has paid off
directly — the 16 reducer tests caught a missing-field bug
(`reduceOnStateChange` was dropping `loadStartedAtMs` from its return
value) *before* it ever reached a browser, exactly the value proposition
established back in Phase 2's `derivePlaybackState`.

One definitional choice worth flagging: **the first wait for data is
startup latency, not a rebuffer.** A rebuffer is specifically an
interruption of playback that had already begun; conflating the two would
make "Rebuffers: 1" appear on every single playback, which isn't what
either metric is supposed to mean. `hasReachedFirstFrame` gates this
distinction in the reducer.

**`DiagnosticsDashboard`** sources data two ways, deliberately: reactive
signals (`state`, `activeTrack`, `metrics`) update immediately and need no
polling; Shaka's `getStats()`/`getBufferedInfo()` and the Network
Information API are snapshot-only (confirmed — no change event exists for
any of them) and are sampled on `environment.diagnosticsPollIntervalMs`,
finally putting that config value to use after sitting unread since Phase
1. The interval is owned by the dashboard component itself (started/
stopped via `effect()` watching the `session` input, cleared on destroy)
rather than by any service — matches "the consumer decides how often to
sample," not "the data source imposes a refresh rate."

**Browser APIs and DRM sections are absent, not placeholder text.** Spec
section 17's dashboard mockup includes MSE/EME/Fullscreen/PiP support and
DRM status — explicitly Phase 8–10 territory. Rather than a `PhasePlaceholder`-style
block sitting inside an otherwise-real dashboard, there's a small, honest
note at the bottom naming what's coming and confirming nothing is faked in
the meantime.

### Decisions worth remembering

**`PhasePlaceholder` was deleted, not left dormant.** With Phase 7 done,
every route that used it (`/player/:id`, `/diagnostics`) now has real
content, and nothing else in the app ever referenced it — confirmed by
grep before deleting, not assumed. Zero remaining call sites is the bar for
deleting rather than leaving unused code around "in case."

**`formatClock`/`formatMbps` were extracted to `shared/utils/format.ts`**
after a third call site (this phase's dashboard) needed them — they'd
already been quietly duplicated between `control-bar.ts` and
`player-page.ts`. `DurationPipe`'s `'clock'` branch now delegates to the
same function, which incidentally fixes a latent bug: `control-bar.ts`'s
local copy never handled durations over an hour (irrelevant for this
catalog's content today, but wrong is wrong).

**Shaka's own stats were used instead of re-deriving overlapping numbers
ourselves.** `getStats()` already reports `droppedFrames`/`decodedFrames`
authoritatively (Shaka computes these from the browser's real decode
pipeline); there was no reason to duplicate that via our own
`getVideoPlaybackQuality()` call. Where Shaka and our own tracking *could*
overlap — rebuffering — the split is deliberate: our own event-driven
count is what's shown, kept independent of Shaka's `stats.stallsDetected`/
`bufferingTime`, since the spec asks the analytics *service* to own this,
not a UI reading Shaka's snapshot.

### Known gaps

- **Still no real-browser verification**, now covering: whether the
  dashboard's numbers look plausible during actual playback, whether the
  in-player diagnostics panel lays out correctly, and whether a totally
  cold visit to `/diagnostics` reads as "intentional empty state" rather
  than "broken page" to someone who hasn't read this file. **Next session,
  open `/player/:id` for any title, toggle Diagnostics, and watch the
  numbers update** — Buffer and Estimated Bandwidth should visibly tick on
  the poll interval; Rebuffers/Quality Switches should increment on
  `meadowlight` if you force a quality change.
- "Jump to live" (deferred in Phase 5) is now technically unblocked —
  `environment.diagnosticsPollIntervalMs`-driven polling exists as a
  pattern in `DiagnosticsDashboard` — but wasn't added to the player's
  control bar this phase, since it wasn't this phase's stated scope.
  Reasonable follow-up whenever live-content UX gets revisited.
- Audio-language selection (Phase 4) remains deferred, unchanged.
- The persistent-mini-player alternative to the current architecture
  decision (see above) remains a legitimate, larger idea if "diagnostics
  survives navigation" ever becomes an actual requirement rather than a
  nice-to-have.

---

## Phase 8 — MSE capability detection + technical documentation panel ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. Initial bundle: 307.59 kB raw /
  80.60 kB transfer (+0.36 kB, negligible). `diagnostics-page` chunk grew
  from 1.76 kB to 6.28 kB (the pipeline panel's content) — still cheap.
- `npx ng test` — **66 passing** (3 new: `detectMseSupport`'s three
  branches, using `vi.stubGlobal`/`vi.unstubAllGlobals` to simulate browsers
  with and without each API — the same jsdom limitation noted in every
  media-related phase since Phase 2 doesn't apply here, since this is a
  plain global-existence check, not something needing real playback).
- `npx ng serve` — `/diagnostics` serves 200.

Not verified: how the pipeline panel actually reads/lays out in a browser,
or what this machine's real MSE support values show (though jsdom's `test`
result already confirms the *logic* is correct for all three cases —
what's unverified is just the rendering).

### What was built

Scoped tightly to what the phase list actually names for Phase 8 — MSE
detection and the pipeline panel — not the full "Browser APIs" row set
(EME/Fullscreen/PiP) the spec's dashboard mockup eventually wants, since
those are explicitly Phase 9's subject and adding them now would blur a
boundary the phase list draws on purpose.

```
src/app/core/models/
  mse-support.model.ts   MseSupport, detectMseSupport()
  mse-support.spec.ts    3 tests via vi.stubGlobal
src/app/shared/components/
  diagnostics-dashboard/   + always-visible "Browser APIs" section
  streaming-pipeline-panel/  new — static "How streaming works" panel
src/app/features/diagnostics/diagnostics-page.ts   + pipeline panel
```

**`detectMseSupport()`** checks two APIs, not one: standard `MediaSource`
and `ManagedMediaSource` — the newer, more restricted API iOS Safari
actually requires (flagged as a risk to watch for back in Phase 7's
handoff notes, and confirmed necessary here: `ManagedMediaSource` isn't
even in TypeScript's bundled DOM types yet, since it's that new). A check
that only tested `window.MediaSource` would silently misreport iOS Safari
as unsupported. `supported` is `true` if *either* is present — that's the
actual thing that matters for playback; the two individual booleans are
shown separately in the dashboard for anyone who wants the detail.

**The "Browser APIs" section is the one part of `DiagnosticsDashboard`
that renders with no active session.** Every other section
(Playback/Network/Performance/Stream) is genuinely about a specific
playback session and correctly shows nothing without one; browser
capability support is a fact about the *browser*, true whether or not
anything is loaded. `sections()` was restructured so this card is always
first, with the other four appended only when `session()` is non-null —
previously the whole dashboard was one all-or-nothing gate.

**`StreamingPipelinePanel`** is deliberately inert — it documents the
Manifest → Segments → MSE → MediaSource → SourceBuffer → HTMLVideoElement
pipeline without executing any part of it (that's Shaka's job, unchanged
since Phase 3). Built as its own small reusable component rather than
inline markup in `DiagnosticsPage`, on the chance a later phase wants it
elsewhere (e.g. the video-details "How streaming works" curiosity a viewer
browsing the catalog, not yet playing anything, might have). Rendered
unconditionally on `/diagnostics`, below the session-gated dashboard —
it's documentation, not data, so it has nothing to wait for.

### Decisions worth remembering

**Fullscreen and Picture-in-Picture detection were deliberately left out**,
even though both are trivial one-line checks (`document.fullscreenEnabled`,
`document.pictureInPictureEnabled`) that could have been added to the same
"Browser APIs" card almost for free. The phase list names Phase 8 as MSE
specifically; the spec's dashboard mockup groups MSE/EME/Fullscreen/PiP
together, but the *phase* boundary is the one that governs what gets built
when. Kept the boundary crisp rather than opportunistically filling in
"since it's cheap" — consistent with treating scope decisions as
deliberate rather than convenience-driven throughout this build.

**Went with our own direct capability check, not Shaka's
`isBrowserSupported()`.** `StreamingPlayerService` already calls that
(since Phase 3) as a combined "can Shaka run at all" gate, but it bundles
MSE, EME and other requirements into one boolean — not granular enough to
answer "is MSE specifically supported," which is what spec section 10
explicitly asks to be detected and shown on its own. Section 11's EME
language (naming `navigator.requestMediaKeySystemAccess` directly) confirms
the spec wants these written as our own targeted feature detection, not
delegated to Shaka's opaque combined check.

### Known gaps

- No real-browser confirmation of what this renders like — see above.
- Fullscreen/PiP/EME rows remain absent from "Browser APIs" until Phase 9,
  per the scoping decision above.
- The pipeline panel's content describes the general MSE pipeline; it
  doesn't (yet) reflect which specific stage the *currently loaded* title
  is in. That would require live instrumentation Shaka doesn't expose at
  that granularity — reasonable to leave as static/educational rather than
  attempt to fake per-stage "you are here" state.

---

## Phase 9 — EME capability detection ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. Initial bundle: **307.81 kB raw /
  80.58 kB transfer** (+0.22 kB over Phase 8, negligible). `diagnostics-page`
  chunk grew from 6.28 kB to 9.70 kB (the DRM pipeline panel's content).
- `npx ng test` — **73 passing** (7 new: 4 for `detectEmeSupport`'s
  available/widevine/rejects/probe-argument branches via
  `vi.stubGlobal('navigator', ...)`, 3 for `detectDisplayCapabilities`).
- `npx ng serve` — `/`, `/diagnostics`, and `/player/chromatic-drift` all
  serve 200.

Not verified: real EME/Widevine values in an actual browser (jsdom has
neither API, so the "unavailable" branch is what the base-case tests
exercise; the resolves/rejects branches are verified against a mocked
`navigator`, not a real CDM negotiation), or how the new DRM pipeline panel
renders. Standing caveat, same shape as every phase since 3.

### What was built

```
src/app/core/models/
  eme-support.model.ts       EmeSupport, detectEmeSupport() — async
  eme-support.spec.ts        4 tests via vi.stubGlobal('navigator', ...)
  display-capabilities.model.ts   DisplayCapabilities, detectDisplayCapabilities()
  display-capabilities.spec.ts    3 tests
src/app/shared/components/
  pipeline-stages/            new — extracted shared list-of-stages renderer
  streaming-pipeline-panel/   refactored to consume pipeline-stages
  drm-pipeline-panel/         new — DRM/EME pipeline diagram
  diagnostics-dashboard/      + EME/Fullscreen/PiP rows in Browser APIs
src/app/features/diagnostics/diagnostics-page.ts   + DrmPipelinePanel
```

**`detectEmeSupport()`** cannot be a synchronous existence check the way
`detectMseSupport()` is — `navigator.requestMediaKeySystemAccess` exists in
essentially every modern browser regardless of whether any key system is
actually usable behind it. The only way to know is to ask it to negotiate
`com.widevine.alpha` with a minimal, standards-valid probe configuration
(`initDataTypes: ['cenc']`, one H.264 `videoCapabilities` entry — no real
content is loaded or decrypted) and see whether the returned promise
resolves or rejects. This is why `EmeSupport` has two independent booleans:
`available` (the API exists at all) and `widevine` (a key system was
actually negotiated) — a browser can have one without the other, e.g. some
Linux Chromium builds expose the API with no CDM behind it.

**`detectDisplayCapabilities()`** is the simple case — `document.fullscreenEnabled`
and `document.pictureInPictureEnabled` are both plain synchronous booleans,
already fully typed in the project's bundled `lib.dom.d.ts` (unlike
`ManagedMediaSource` in Phase 8, no cast was needed here). Grouped with EME
in the "Browser APIs" section per the phase 9 plan, but kept as its own
small model file since it's a genuinely different kind of check (sync flag
vs. async negotiation) — mirrors `detectMseSupport()`'s shape, not
`detectEmeSupport()`'s.

**`DiagnosticsDashboard.browserApiSection` became a `computed()`**, not a
plain field like Phase 8 left it. It has to react to `emeSupport()`
resolving from `null` ("Checking…") to a real value, so it can no longer be
a value computed once in a field initializer. The EME probe itself is
kicked off once from the constructor — `void detectEmeSupport().then(...)`
— independent of `session()`, matching MSE/Fullscreen/PiP: capability
support is a fact about the browser, checked once, not re-checked per
session.

**`PipelineStages` was extracted** from `StreamingPipelinePanel` (Phase 8)
on this, its second real use — `DrmPipelinePanel` needed the exact same
numbered-stage-with-connector-arrows markup and responsive layout, just
different `title`/`description` data. Both panels now own only their
heading/subtitle text and a `STAGES` array; `PipelineStages` owns the list
markup and all the SCSS that makes it lay out vertically on mobile and
horizontally past 900px. `StreamingPipelinePanel`'s own SCSS shrank to just
`.panel-heading`/`.panel-subtitle`.

**`DrmPipelinePanel`** documents Application → EME → Browser DRM/CDM →
License Server → Decryption → Playback (spec section 11), the same "purely
inert documentation" contract as the Phase 8 MSE panel — nothing here
executes any part of what it describes. It also states
`environment.drm.enabled`'s real current value (`false`) directly in the
panel copy, rather than only in a code comment, so a reader sees in the UI
itself that this pipeline is explained but never actually exercised by any
catalog title.

### Decisions worth remembering

**Two-field `EmeSupport` (`available` + `widevine`), not one boolean.**
Collapsing to a single "EME supported: yes/no" would hide the real and
useful distinction between "no EME API" and "EME API present, no usable key
system" — different facts with different implications for someone reading
the diagnostics page. Both are shown as separate rows.

**The EME probe runs once per dashboard instance, not once globally.**
Every phase since 3 has treated `DiagnosticsDashboard` as safe to mount
more than once (in `/player/:id`'s toggle panel and `/diagnostics`
simultaneously, in principle). A module-level cache would have been a
reasonable optimization — negotiating `com.widevine.alpha` is not free —
but introducing shared mutable state across component instances wasn't
this phase's problem to solve, and the probe is cheap enough (one promise,
resolved once, never repeated within a single mount) not to need it yet.

**`PipelineStages` extracted on the second use, not deferred to a third.**
This runs against the general "extract on third duplication" heuristic
this build has otherwise followed (`formatClock`/`formatMbps` waited for a
third call site in Phase 7). The difference here: this wasn't three
*similar* pieces of logic converging on a pattern worth naming — it was the
exact same markup and SCSS about to be copy-pasted verbatim for a second
component with zero variation except the data. That's not a premature
abstraction; it's avoiding an immediate, known duplicate.

### Known gaps

- **Still no real-browser verification** — now covering: real EME/Widevine
  values on an actual machine (this environment's build/test tooling can't
  produce that signal — jsdom implements neither the Fullscreen nor
  Picture-in-Picture APIs, so `detectDisplayCapabilities()`'s "both false"
  branch is what's actually exercised by the test suite, not the "true"
  branches, which are only verified via `vi.stubGlobal` mocking), and how
  `DrmPipelinePanel` renders/lays out. **Next session, open `/diagnostics`
  in a real desktop browser and confirm:** the Browser APIs card shows
  "Checking…" only briefly before resolving to real Supported/Not supported
  values, and Widevine reads "Supported" on Chrome/Firefox/Edge (Widevine
  ships in all three by default).
- DRM key-system *configuration* status (as opposed to browser *capability*,
  which this phase covers) remains Phase 10 territory, per the standing
  scope boundary.
- No audio-language selection (Phase 4) or "jump to live" (Phase 5) —
  unchanged, noted here only so the running list stays complete.

---

## Phase 10 — Optional DRM / Widevine configuration ✅

### Verified

- `npx tsc --noEmit -p tsconfig.app.json` — zero errors.
- `npx ng build` — clean, zero warnings. **Initial bundle: 307.81 kB raw /
  80.61 kB transfer — byte-for-byte unchanged from Phase 9.** `diagnostics-page`
  chunk also unchanged at 9.70 kB — confirms the new DRM section added no
  `shaka-player` import to that lazy chunk (see the type-only-import
  decision below). `player-page` chunk: 845.93 kB raw / 225.64 kB transfer
  (+0.21 kB, `StreamingPlayerService`'s new `configureDrm`/`getDrmInfo`).
- `npx ng test` — **76 passing** (3 new: `resolveDrmServers`'s
  disabled/empty-servers/filters-correctly branches).
- `npx ng serve` — `/diagnostics` and `/player/meadowlight` both serve 200.

Not verified: actual DRM negotiation against a real license server in a
browser — expected, since `environment.drm.enabled` is `false` by default
and no catalog title is encrypted, so this code path is real but currently
unexercised end to end. See Known gaps.

### What was built

```
src/app/core/models/
  drm-config.model.ts    resolveDrmServers() — pure function
  drm-config.spec.ts     3 tests
src/app/core/services/streaming-player.service.ts
  + configureDrm() (called from attach()), drmConfigured signal, getDrmInfo()
src/app/shared/components/diagnostics-dashboard/
  + "DRM" section (session-gated): Configuration, Servers configured,
    Active key system, License server
```

**`resolveDrmServers(config)`** is the one piece of real logic this phase
needed, pulled out as a pure function per this build's standing pattern
(`distinctQualityLevels`, `clampSeekTarget`, `detectMseSupport`, …):
`environment.drm.enabled` alone isn't sufficient to know whether there's
anything to configure — the shipped default has `enabled: false` **and**
every server URL empty, and in principle those two facts could disagree
(enabled with nothing configured, or vice versa). The function returns
`null` unless both conditions hold, and only the key systems with a
non-empty URL survive into what gets passed to Shaka.

**`StreamingPlayerService.configureDrm()`** runs once per player instance,
from `attach()`, before the element is attached — DRM server configuration
is static per-app config in this design (mirroring the shape
`environment.drm` was already given back in Phase 1: one global
`servers` map, not per-asset), not something that varies per `load()`
call. When `resolveDrmServers` returns `null` (the default), this is a
no-op — `attach()`'s behavior is unchanged from Phase 9.

**`getDrmInfo()`** wraps Shaka's own `player.drmInfo()` — `null` unless
the currently loaded content is actually encrypted and a key system is
active. Same "snapshot, not a signal" shape as `getStats()`/
`getBufferedInfo()` from Phase 7 (confirmed via the same discipline: no
change event exists for this either), polled by `DiagnosticsDashboard` on
`environment.diagnosticsPollIntervalMs`.

**The dashboard's new signals store primitives (`keySystem`/
`licenseServerUri` strings), not the whole `DrmInfo` object.** This was a
deliberate bundle-size decision, not just a style preference: importing
`shaka-player` as a *value* into `diagnostics-dashboard.ts` to name the
`shaka.extern.DrmInfo` type would pull Shaka's ~837 kB runtime into the
`diagnostics-page` chunk, which today has no Shaka dependency at all (it
only reaches Shaka-derived data through already-typed service method
return values, inferred structurally — the same reason `getStats()`'s
`stats` local variable never needed an explicit `shaka` import either).
Confirmed by the build output above: `diagnostics-page` is unchanged at
9.70 kB. This is the same bundle-discipline lesson `DecimalPipe` taught in
Phase 6, applied proactively this time instead of caught after the fact.

### Decisions worth remembering

**Global `environment.drm.servers`, not a per-`VideoAsset` DRM config.**
The environment shape Phase 1 already committed to (`Readonly<Record<KeySystemId, string>>`,
one map for the whole app) implies a single-tenant model — one org's DRM
backend serving every protected title — which is how `configureDrm()` was
built. A per-asset design (different titles needing different license
servers) is a legitimate alternative shape but would have meant revisiting
`StreamSource`/`VideoAsset`, which nothing in the existing environment
contract or spec section 12 asked for.

**No live encrypted demo asset was added to the catalog**, even though
publicly documented no-auth-required Widevine test streams exist (e.g. the
ones Shaka Player's own official demo uses) that could have proven this
pipeline end to end. Deliberately not attempted: this environment has no
real browser to confirm such a stream still resolves and actually decrypts
today (test/demo endpoints drift and go stale — Phases 3-6 already flagged
this exact risk for the *unencrypted* catalog URLs, which are lower-risk
than a DRM negotiation), and shipping a catalog entry that silently fails
DRM negotiation would be worse than the current honest "real code path,
zero exercised titles" state. The plumbing is real and unit-tested; the
demonstration is not — recorded here as a deliberate, not accidental, scope
line.

**`drmConfigured` is a fact about the player instance, not about
`environment.drm.enabled` alone.** A dashboard reading only the
environment flag would say "Enabled" even in a hypothetical future where
someone sets `enabled: true` but leaves every server URL blank — which
would be misleading, since nothing would actually be configured on the
Shaka player in that case. Exposing both `environment.drm.enabled` *and*
`session.player.drmConfigured()` as separate dashboard rows keeps that
distinction honest instead of collapsing it.

### Known gaps

- **DRM negotiation has never been exercised against a real license
  server.** This is the natural continuation of the standing "no browser in
  this environment" caveat, now at its highest-stakes point: unlike
  playback correctness (visually obvious when broken) or captions
  (visually obvious when absent), a DRM misconfiguration typically fails
  silently or with an opaque browser-level error. If DRM is ever turned on
  for real, **the very first thing to check in a browser is the Player
  error overlay** (already wired since Phase 3) — Shaka surfaces failed
  license requests as real `shaka.util.Error`s through the exact same path
  every other player error already takes.
- Per-asset DRM configuration (different titles needing different license
  servers/key systems) remains unbuilt — see the architecture decision
  above. Worth revisiting only if a real multi-tenant DRM requirement ever
  emerges; nothing in the current spec asks for it.
- The "Active key system"/"License server" dashboard rows will read `—` for
  every catalog title today, by design — flagged explicitly in the
  dashboard's own UI copy now, not just in this file, so it reads as
  intentional to anyone encountering it cold.

---

## Next: Phase 11 — Network simulation tooling

Planned shape (not yet built):

- A dev-only panel (gated by `environment.enableDeveloperTools`, unused
  since Phase 1 — the same "config value sat waiting for its phase" pattern
  `diagnosticsPollIntervalMs` followed until Phase 7) that lets someone
  artificially degrade network conditions to *see* ABR react, rather than
  just trusting it works.
- The real technique: `shaka.net.NetworkingEngine.registerRequestFilter`/
  `registerResponseFilter` (confirmed present on the shipped `.d.ts`) can
  delay or throttle segment/manifest fetches from inside the app — this is
  the standard way player demos simulate poor networks, since there's no
  browser API to actually throttle the connection from page JavaScript
  itself (that's DevTools-only, outside this app's control).
- Likely controls: a bandwidth cap (kbps) and/or added latency (ms),
  applied only when a developer-tools toggle is on; wired through
  `StreamingPlayerService` (the one place Shaka-specific code is allowed to
  live, per the rule every phase since 3 has followed) rather than reaching
  into Shaka's networking engine from a component.
- Should surface visibly in the existing quality/bitrate chip and
  `DiagnosticsDashboard`'s "Estimated bandwidth" row (both already real,
  reactive/polled values since Phase 6/7) — the point of this phase is that
  throttling something real and watching an already-real number respond,
  not adding a new fake metric.
