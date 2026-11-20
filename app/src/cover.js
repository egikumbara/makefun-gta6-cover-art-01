// Draws the cover art: multi-panel comic poster, photo grades, bold caption
// lettering and the VI badge, onto any 2D canvas at any size. Pure canvas,
// no network and no assets beyond the photos the caller hands it.

import { LAYOUTS, PRESETS } from './presets.js';

/** Deterministic random stream, so the grain looks the same every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/**
 * Pixel rects for a layout inside the framed cover area.
 * Returns [{x, y, w, h, slot}] in cover pixels.
 */
export function layoutPanels(w, h, layoutKey) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.hero;
  const m = Math.round(Math.min(w, h) * 0.035);
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.012));
  const ax = m, ay = m, aw = w - 2 * m, ah = h - 2 * m;
  return layout.panels.map((p) => {
    const [fx, fy, fw, fh] = p.rect;
    const x = Math.round(ax + fx * aw + (fx > 0 ? gap / 2 : 0));
    const y = Math.round(ay + fy * ah + (fy > 0 ? gap / 2 : 0));
    const pw = Math.round(fw * aw - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0));
    const ph = Math.round(fh * ah - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0));
    return { x, y, w: pw, h: ph, slot: p.slot };
  });
}

/** Draws one photo into a panel, cover-fit, with the slot's zoom and pan. */
function drawPhoto(ctx, panel, slot) {
  const img = slot.img;
  const { x, y, w, h } = panel;
  if (!img) { drawPlaceholder(ctx, panel); return; }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = slot.zoom || 1;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale, dh = ih * scale;
  const ox = clamp(slot.ox || 0, -1, 1) * Math.max(0, (dw - w) / 2);
  const oy = clamp(slot.oy || 0, -1, 1) * Math.max(0, (dh - h) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  ctx.restore();
}

/** Empty slot: a sunset gradient with a sun disc and an "ADD PHOTO" note. */
function drawPlaceholder(ctx, panel) {
  const { x, y, w, h } = panel;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ff9a3d'); g.addColorStop(0.55, '#ff5e78'); g.addColorStop(1, '#4b2a72');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.42, Math.min(w, h) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${Math.max(12, Math.round(h * 0.045))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD PHOTO', x + w / 2, y + h * 0.78);
}

/** Comic halftone dots across the caption band. */
function drawHalftone(ctx, w, h, alpha) {
  const top = h * 0.6, step = Math.max(10, Math.round(w * 0.014));
  const r = Math.max(1.2, step * 0.16);
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  let row = 0;
  for (let y = top; y < h; y += step, row++) {
    for (let x = (row % 2 ? step / 2 : 0); x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: seeded dots over the whole cover. */
function drawGrain(ctx, w, h) {
  const rand = mulberry32(20261121);
  const count = Math.round((w * h) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Splits a caption into at most two lines that fit maxWidth at size. */
function fitCaptionLines(ctx, text, maxWidth, size) {
  const words = text.split(/\s+/).filter(Boolean);
  ctx.font = titleFont(size);
  if (ctx.measureText(text).width <= maxWidth || words.length < 2) return [text];
  let best = null;
  for (let cut = 1; cut < words.length; cut++) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (w <= maxWidth) { best = [a, b]; break; }
    if (!best || w < best.w) best = { lines: [a, b], w };
  }
  return best.lines ?? [text];
}

export function titleFont(size) {
  return `900 ${Math.round(size)}px "Arial Black", "Noto Sans", Impact, system-ui, sans-serif`;
}

/** The bold caption: scrim, subtitle, title and accent rule. */
function drawCaption(ctx, w, h, state, preset) {
  const title = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (!title && !subtitle) return;
  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.52, 0, h);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, preset.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.52, w, h * 0.48);

  const margin = Math.round(Math.min(w, h) * 0.055);
  const maxWidth = w - margin * 2;
  let size = h * 0.088;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let lines = [title];
  if (title) {
    while (size > h * 0.03) {
      lines = fitCaptionLines(ctx, title, maxWidth, size);
      const widest = Math.max(...lines.map((ln) => {
        ctx.font = titleFont(size);
        return ctx.measureText(ln).width;
      }));
      if (widest <= maxWidth) break;
      size -= Math.max(1, h * 0.004);
    }
  }
  const lineHeight = size * 1.02;
  const titleBottom = h - margin * 0.9;
  const titleTop = titleBottom - (lines.length - 1) * lineHeight;
  const subSize = Math.max(11, Math.round(h * 0.026));

  // Subtitle above the title, letterspaced, in the preset accent colour.
  // The title's cap height is ~0.72 * size above its first baseline, so the
  // subtitle sits a full line above that, clear of the title glyphs.
  if (subtitle) {
    const subtitleY = titleTop - size * 0.98;
    ctx.font = `800 ${subSize}px "Noto Sans", system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, Math.round(h * 0.006))}px`; } catch { /* older canvas */ }
    ctx.fillStyle = preset.accent;
    ctx.fillText(subtitle, margin, subtitleY);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.fillStyle = preset.accent;
    ctx.fillRect(margin, subtitleY + subSize * 0.7, Math.min(maxWidth * 0.3, 220), Math.max(2, h * 0.004));
  }

  // Title, one or two lines, with a heavy outline and optional neon glow.
  const lettering = state.lettering || 'block';
  lines.forEach((line, i) => {
    const y = titleTop + i * lineHeight;
    ctx.font = titleFont(size);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (lettering === 'neon') {
      ctx.shadowColor = preset.accent;
      ctx.shadowBlur = size * 0.35;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = size * 0.08;
      ctx.shadowOffsetY = size * 0.03;
    }
    if (lettering === 'outline') {
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(line, margin, y);
      ctx.lineWidth = Math.max(1, size * 0.02);
      ctx.strokeStyle = preset.titleStroke;
      ctx.strokeText(line, margin, y);
    } else {
      ctx.lineWidth = Math.max(2, size * 0.14);
      ctx.strokeStyle = preset.titleStroke;
      ctx.strokeText(line, margin, y);
      ctx.fillStyle = preset.title;
      ctx.fillText(line, margin, y);
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  });
}

/** The VI badge: big gradient numerals, tilted, top right inside the frame. */
function drawBadge(ctx, w, h, preset) {
  const size = h * 0.115;
  const m = Math.min(w, h) * 0.035;
  ctx.save();
  ctx.translate(w - m - size * 0.62, m + size * 0.92);
  ctx.rotate(-0.06);
  ctx.font = titleFont(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const g = ctx.createLinearGradient(0, -size, 0, 0);
  g.addColorStop(0, '#ff5e78');
  g.addColorStop(0.55, preset.accent);
  g.addColorStop(1, '#ff7a3c');
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeStyle = 'rgba(10,4,20,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.04;
  ctx.strokeText('VI', 0, 0);
  ctx.fillStyle = g;
  ctx.fillText('VI', 0, 0);
  ctx.restore();
}

/**
 * Renders the whole cover onto ctx (already sized w x h) from state.
 * state: { layout, preset, lettering, caption, subtitle, badge, grain,
 *   halftone, photos: [{img, zoom, ox, oy}] }.
 */
export function drawCover(ctx, w, h, state) {
  const preset = PRESETS[state.preset] ?? PRESETS.sunset;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = preset.frame;
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(w, h, state.layout || 'hero');
  for (const panel of panels) {
    const slot = state.photos[panel.slot] ?? { img: null, zoom: 1, ox: 0, oy: 0 };
    drawPhoto(ctx, panel, slot);
  }

  // Colour grade wash over the panels.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, preset.top);
  wash.addColorStop(1, preset.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Vignette: darker corners, brighter middle.
  const vg = ctx.createRadialGradient(
    w / 2, h * 0.42, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Panel gutters: thin bright seams between panels and around the frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.004);
  for (const p of panels) ctx.strokeRect(p.x, p.y, p.w, p.h);

  if (state.halftone) drawHalftone(ctx, w, h, preset.halftone);
  drawCaption(ctx, w, h, state, preset);
  if (state.badge) drawBadge(ctx, w, h, preset);
  if (state.grain) drawGrain(ctx, w, h);

  // Outer frame.
  const fw = Math.max(3, Math.round(Math.min(w, h) * 0.018));
  ctx.strokeStyle = preset.frame;
  ctx.lineWidth = fw;
  ctx.strokeRect(fw / 2, fw / 2, w - fw, h - fw);
}

/** Renders state at w x h on a fresh canvas and returns it. */
export function exportCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state);
  return canvas;
}
