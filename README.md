# 🍾 Spin the Bottle

A cute, dependency-free static page for the chronically indecisive. Type in your
options, watch them spread themselves around a circle, then spin the bottle and
let it choose for you. Comes in three themes: amber-and-oak **Alus** (default),
claret **Bordeaux**, and the original bubblegum **Candy**.

![no build step, no dependencies](https://img.shields.io/badge/build-none-c07a1e)

## Features

- **Add options** one at a time, or paste a whole batch separated by commas / new lines.
- **Options are laid out around a circle** as coloured slices with labels, up to 24 of them.
- **Three themes**, picked from the options panel:
  - **Alus** (default) — oat linen, amber glass and a carmine accent, spinning a
    Latvian-style longneck. The silhouette is traced from a real 0.5 l bottle's
    measured width profile (height:width 3.57, neck a quarter of the height
    flaring 0.36→0.56 of body width, shoulder 28–40%, body 40–96%), with a
    crimped crown cap. Bare glass — no label, no brand marks. It spins about
    its silhouette centroid (44% up from the base), where an empty bottle
    actually balances, rather than about a point near the heel.
  - **Bordeaux** — claret, bottle green and limestone, spinning a high-shouldered
    Bordeaux bottle traced the same way (height:width 4.07, neck barely flaring
    across 24% of the height, a steep 24–38% shoulder, 58% straight body), with a
    foil capsule and no label.
  - **Candy** — the original bubblegum/lavender palette and mint bottle.
- **Spin the bottle** — it accelerates, decelerates on an ease-out curve, and lands
  on a random slice (uniform over the options, with a bit of jitter so it doesn't
  always stop dead centre).
- **Winner celebration**: confetti, a bounce-in card, and the winning slice
  highlighted on the wheel.
- **Remove & respin** for elimination-style rounds.
- **Options and theme are saved** in `localStorage`, and encoded in the URL hash
  (`#o=Pizza|Sushi&s=candy`) so **Copy link** shares the circle *and* the look.
- Keyboard friendly (`Space` spins, `Esc` closes the winner card), responsive,
  and respects `prefers-reduced-motion`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup: option panel, theme picker, wheel, both bottle SVGs, winner card |
| `styles.css` | Theme tokens, layout, animations |
| `app.js` | Option and theme state, wheel geometry, spin maths, confetti |
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

- **Themes**: each one is two pieces — a token block in `styles.css` (`:root` is the
  default skin, `:root[data-skin="candy"]` overrides the same names) and an entry in
  `THEMES` in `app.js` (slice colours, confetti colours, header emoji). To add another,
  copy both, add a `<button class="theme-btn" data-skin="…">` to the theme row, add the
  skin to the `.art` display rule, and drop a `<g class="art art-…">` bottle inside
  `#bottle` — each bottle carries its own transform, so it pivots on its own centre of mass.
- **Colours**: components only reference tokens, never raw hex, so re-skinning is
  confined to those two blocks.
- **Starting options**: the `DEFAULTS` array in `app.js`.
- **Limits**: `MAX_OPTIONS` (24) and `MAX_LEN` (40) in `app.js`.
- **Spin feel**: the `duration` / `turns` values in `spin()`, and the
  `cubic-bezier` on `.bottle` in `styles.css`.

## Licence

MIT.
