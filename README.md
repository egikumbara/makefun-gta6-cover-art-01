# makefun-gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/egikumbara/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/egikumbara/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Sunset Cover Studio turns your photo and a caption into GTA 6-style multi-panel poster art: pick a comic layout and a Vice City colour grade, crop and position each photo, then export a PNG in 1080x1080, 1080x1350 or 1920x1080 — fully offline, no upload, no account.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve `app/` with any static file server and open `app/index.html`.

## How it works

- **Photos**: upload up to three of your own, or tap a built-in sample. Click a panel in the preview to select it, drag to move its photo, scroll to zoom, or use the sliders.
- **Layouts**: Hero (one photo), Duo (stacked pair), Trio (comic three) and Quad (four panels) — one photo can fill several panels with different crops.
- **Grades**: Sunset, Neon Nights, Pastel Vice and Noir, each with its own wash, caption colours, halftone dots and frame.
- **Caption**: bold poster lettering in Block, Outline or Neon glow styles, plus a subtitle, a VI badge, film grain and halftone dots.
- **Export**: one click per size, or all three at once. The PNG is rendered on a canvas at the full post size.

The built-in sample photos are drawn from scratch with code (`tools/generate-samples.py`) — no Rockstar Games logo, artwork, character or font is used anywhere in this entry.

---

<sub>Entered on [make.fun](https://make.fun/?ref=q1q35jmc&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
