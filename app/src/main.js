// Wires the editor: photos, samples, layouts, grades, caption, panel
// drag-to-pan and wheel zoom, and PNG export in the three post sizes.
// Runs entirely offline; photos are read on the user's machine only.

import { SIZES, LAYOUTS, PRESETS, LETTERING, SAMPLES, defaultState } from './presets.js';
import { drawCover, exportCover, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const state = defaultState();
const canvas = $('cover');
const statusEl = $('status');

let drag = null; // {x, y, ox, oy} while the pointer pans a photo

function setStatus(text) { statusEl.textContent = text; }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[state.sizeKey];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas.getContext('2d'), size.w, size.h, state);
  syncPanelControls();
}

function syncPanelControls() {
  const panel = layoutPanels(canvas.width, canvas.height, state.layout)[state.activePanel];
  const slot = panel ? state.photos[panel.slot] : null;
  $('panelLabel').textContent = panel
    ? `Panel ${state.activePanel + 1} · photo ${panel.slot + 1}`
    : 'No panel';
  if (!slot) return;
  $('zoom').value = slot.zoom;
  $('panX').value = slot.ox;
  $('panY').value = slot.oy;
  $('zoomVal').textContent = `${slot.zoom.toFixed(2)}x`;
}

/** Builds a row of toggle buttons from a data table. */
function buildButtons(containerId, table, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const [key, entry] of Object.entries(table)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (key === current ? ' active' : '');
    b.textContent = entry.label;
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
    });
    box.appendChild(b);
  }
}

function buildSamples() {
  const box = $('samples');
  box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sample';
    b.title = `${s.label} — load into the selected panel`;
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.label;
    const cap = document.createElement('span');
    cap.textContent = s.label;
    b.append(img, cap);
    b.addEventListener('click', async () => {
      const panel = layoutPanels(canvas.width, canvas.height, state.layout)[state.activePanel];
      const slot = state.photos[panel.slot];
      slot.img = await loadImage(s.src);
      slot.src = s.src;
      slot.zoom = 1; slot.ox = 0; slot.oy = 0;
      redraw();
      setStatus(`${s.label} loaded into photo ${panel.slot + 1}.`);
    });
    box.appendChild(b);
  }
}

function buildPhotoInputs() {
  const box = $('photoInputs');
  box.innerHTML = '';
  state.photos.forEach((slot, i) => {
    const label = document.createElement('label');
    label.className = 'fileRow';
    label.textContent = `Photo ${i + 1} `;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        slot.img = await loadImage(URL.createObjectURL(file));
        slot.src = file.name;
        slot.zoom = 1; slot.ox = 0; slot.oy = 0;
        redraw();
        setStatus(`${file.name} loaded into photo ${i + 1}.`);
      } catch {
        setStatus(`Could not read ${file.name} as an image.`);
      }
    });
    label.appendChild(input);
    box.appendChild(label);
  });
}

/** Canvas point (css pixels) -> cover pixels, for panel hit-testing. */
function toCoverPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(point) {
  const panels = layoutPanels(canvas.width, canvas.height, state.layout);
  return panels.findIndex((p) =>
    point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h);
}

function activeSlot() {
  const panel = layoutPanels(canvas.width, canvas.height, state.layout)[state.activePanel];
  return panel ? state.photos[panel.slot] : null;
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCoverPoint(e);
    const hit = panelAt(p);
    if (hit >= 0) state.activePanel = hit;
    const slot = activeSlot();
    drag = slot ? { x: e.clientX, y: e.clientY, ox: slot.ox, oy: slot.oy } : null;
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const slot = activeSlot();
    if (!slot) return;
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const panel = layoutPanels(canvas.width, canvas.height, state.layout)[state.activePanel];
    slot.ox = Math.max(-1, Math.min(1, drag.ox + ((e.clientX - drag.x) * scaleX * 2) / Math.max(1, panel.w)));
    slot.oy = Math.max(-1, Math.min(1, drag.oy + ((e.clientY - drag.y) * scaleX * 2) / Math.max(1, panel.h)));
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = activeSlot();
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(4, slot.zoom * (1 - e.deltaY * 0.0012)));
    redraw();
  }, { passive: false });
}

function bindControls() {
  buildButtons('layoutBtns', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.activePanel = 0;
    redraw();
  });
  buildButtons('presetBtns', PRESETS, state.preset, (key) => {
    state.preset = key;
    redraw();
  });
  buildButtons('letterBtns', LETTERING, state.lettering, (key) => {
    state.lettering = key;
    redraw();
  });
  buildButtons('sizeBtns', SIZES, state.sizeKey, (key) => {
    state.sizeKey = key;
    redraw();
    setStatus(`Preview is now ${SIZES[key].label}.`);
  });

  $('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('badge').addEventListener('change', (e) => { state.badge = e.target.checked; redraw(); });
  $('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
  $('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; redraw(); });

  $('zoom').addEventListener('input', (e) => {
    const slot = activeSlot();
    if (slot) { slot.zoom = Number(e.target.value); redraw(); }
  });
  $('panX').addEventListener('input', (e) => {
    const slot = activeSlot();
    if (slot) { slot.ox = Number(e.target.value); redraw(); }
  });
  $('panY').addEventListener('input', (e) => {
    const slot = activeSlot();
    if (slot) { slot.oy = Number(e.target.value); redraw(); }
  });
  $('resetPhoto').addEventListener('click', () => {
    const slot = activeSlot();
    if (slot) { slot.zoom = 1; slot.ox = 0; slot.oy = 0; redraw(); }
  });

  $('exportBtn').addEventListener('click', () => exportSize(state.sizeKey));
  $('exportAllBtn').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) await exportSize(key);
    setStatus('Exported all three sizes.');
  });
}

/** Renders the cover at a size and downloads it as a PNG. */
export function exportSize(sizeKey) {
  const size = SIZES[sizeKey];
  const out = exportCover(state, size.w, size.h);
  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-sunset-cover-${size.w}x${size.h}.png`;
      a.click();
      window.__lastExport = { w: size.w, h: size.h, bytes: blob.size };
      setStatus(`Saved vice-sunset-cover-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KB).`);
      resolve(window.__lastExport);
    }, 'image/png');
  });
}

async function init() {
  buildSamples();
  buildPhotoInputs();
  bindControls();
  bindCanvas();
  // Built-in samples, so the first paint already looks like a cover.
  for (let i = 0; i < state.photos.length; i++) {
    try { state.photos[i].img = await loadImage(state.photos[i].src); } catch { /* keep placeholder */ }
  }
  redraw();
  setStatus('Ready — pick a layout, a grade and a caption, then export.');

  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query.get('shot'), query, {
      state, loadImage, redraw,
      setCaption: (text) => { state.caption = text; $('caption').value = text; },
      setSubtitle: (text) => { state.subtitle = text; $('subtitle').value = text; },
    });
  }
  // Handle for scripted screenshots and export tests.
  window.__app = { state, exportSize, redraw, loadImage, SIZES };
}

init();
