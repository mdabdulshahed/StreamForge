# StreamForge

An adaptive video streaming platform for the browser — HLS and MPEG-DASH
delivery through Shaka Player, Media Source Extensions, ABR behaviour and live
playback diagnostics, built as an Angular application.

> **Build status: Phase 1 of 13 complete.**
> Full architecture documentation is written in Phase 13. Until then,
> **[`progress.md`](./progress.md)** is the authoritative record of what exists,
> what does not, and why each decision was made.

## Quick start

Requires **Node 24.19.0** (pinned in `.nvmrc`). Angular 22 will refuse to run on
older releases.

```bash
nvm use          # or: export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
npm install
npm start        # http://localhost:4200
```

```bash
npm run build    # production bundle
npx ng test      # unit tests (Vitest)
```

## Stack

Angular 22 (standalone, zoneless, signals) · TypeScript 6 (strict) ·
Tailwind CSS v4 + SCSS · Shaka Player 5 · HLS · MPEG-DASH · MSE · EME

## Content and licensing

Every title in the catalog is **fictional**, presented over **publicly published
test streams** — Shaka demo assets, DASH-IF reference streams, Unified Streaming
and Apple sample playlists, Bitmovin and Mux public demos. Each asset carries a
`sourceCredit` field surfaced in the UI. No copyrighted content is hosted or
referenced, and the project is not affiliated with any streaming service.

DRM support is configuration-only and **disabled by default**. No license
credentials are present in this repository, and none should ever be committed.
