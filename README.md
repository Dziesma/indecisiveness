# 🍾 Spin the Bottle

A cute, dependency-free static page for the chronically indecisive. Type in your
options, watch them spread themselves around a circle, then spin the bottle and
let it choose for you.

![no build step, no dependencies](https://img.shields.io/badge/build-none-ff8fab)

## Features

- **Add options** one at a time, or paste a whole batch separated by commas / new lines.
- **Options are laid out around a circle** as coloured slices with labels, up to 24 of them.
- **Spin the bottle** — it accelerates, decelerates on an ease-out curve, and lands
  on a random slice (uniform over the options, with a bit of jitter so it doesn't
  always stop dead centre).
- **Winner celebration**: confetti, a bounce-in card, and the winning slice
  highlighted on the wheel.
- **Remove & respin** for elimination-style rounds.
- **Options are saved** in `localStorage`, and encoded in the URL hash so you can
  share a ready-made circle with the **Copy link** button.
- Keyboard friendly (`Space` spins, `Esc` closes the winner card), responsive,
  and respects `prefers-reduced-motion`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup: option panel, wheel, bottle SVG, winner card |
| `styles.css` | Pastel theme, layout, animations |
| `app.js` | Option state, wheel geometry, spin maths, confetti |
| `.github/workflows/deploy.yml` | Builds nothing, publishes the folder to GitHub Pages |
| `.nojekyll` | Tells Pages to serve the files as-is |

## Run it locally

It's plain HTML/CSS/JS — no build step. Serve the folder with anything:

```bash
python3 -m http.server 8000    # then open http://localhost:8000
# or
npm start                       # uses npx serve
```

Opening `index.html` directly with `file://` mostly works too, though the URL-hash
sharing is nicer over HTTP.

## Deploy to GitHub Pages

### Option A — GitHub Actions (included)

1. Push this repo to GitHub with `main` as the default branch.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes the site at
   `https://<user>.github.io/<repo>/`.

### Option B — deploy from a branch

**Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**. Since
everything is static and all paths are relative, that works with no workflow at all.

## Tweaking

- **Colours**: the `PALETTE` array at the top of `app.js` (slices, chips, confetti)
  and the CSS custom properties in `:root` in `styles.css`.
- **Starting options**: the `DEFAULTS` array in `app.js`.
- **Limits**: `MAX_OPTIONS` (24) and `MAX_LEN` (40) in `app.js`.
- **Spin feel**: the `duration` / `turns` values in `spin()`, and the
  `cubic-bezier` on `.bottle` in `styles.css`.

## Licence

MIT.
