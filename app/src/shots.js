// Fixed scenes for screenshots: ?shot=cover shows the cover alone at full
// size, ?shot=editor shows the editor with a photo loaded. The query picks
// the sample photos, caption, layout, grade and export size, e.g.
//   ?shot=cover&size=wide&photo=neon&photo2=sunset&caption=Neon%20Nights
// window.__shotReady is set once the scene has painted.

import { SAMPLES } from './presets.js';

/** Loads a sample photo into one slot, leaving the slot as-is on failure. */
async function loadSampleInto(api, slotIndex, sampleId) {
  const sample = SAMPLES.find((s) => s.id === sampleId);
  if (!sample) return;
  const slot = api.state.photos[slotIndex];
  if (!slot) return;
  try {
    slot.img = await api.loadImage(sample.src);
    slot.src = sample.src;
    slot.zoom = 1; slot.ox = 0; slot.oy = 0;
  } catch { /* keep whatever the slot already holds */ }
}

export async function runShot(shot, query, api) {
  const state = api.state;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  if (query.get('size') && api.state) state.sizeKey = query.get('size');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('preset')) state.preset = query.get('preset');
  if (query.get('lettering')) state.lettering = query.get('lettering');
  if (query.get('caption') !== null) api.setCaption(query.get('caption'));
  if (query.get('subtitle') !== null) api.setSubtitle(query.get('subtitle'));
  if (query.get('badge') !== null) state.badge = query.get('badge') !== '0';
  if (query.get('grain') !== null) state.grain = query.get('grain') !== '0';

  await loadSampleInto(api, 0, query.get('photo') ?? 'sunset');
  await loadSampleInto(api, 1, query.get('photo2') ?? 'neon');
  await loadSampleInto(api, 2, query.get('photo3') ?? 'palms');

  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
