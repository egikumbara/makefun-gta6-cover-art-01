// Shared data for Vice Sunset Cover Studio: export sizes, panel layouts,
// colour grades and lettering styles. Pure data, no DOM access, so the
// drawing engine (cover.js) and the editor (main.js) stay in sync.

/** The three post sizes the bounty asks for, keyed by their button id. */
export const SIZES = {
  square: { label: 'Square · 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 x 1080', w: 1920, h: 1080 },
};

/**
 * Panel layouts. Each layout is a list of panels; a panel is
 * [x, y, w, h] in fractions of the framed cover area, plus the photo slot
 * it shows. Slot 0 is the first photo, slot 1 the second, slot 2 the third;
 * a layout may show one photo in two panels with a different crop.
 */
export const LAYOUTS = {
  hero: {
    label: 'Hero · one photo',
    panels: [{ rect: [0, 0, 1, 1], slot: 0 }],
  },
  duo: {
    label: 'Duo · stacked pair',
    panels: [
      { rect: [0, 0, 1, 0.58], slot: 0 },
      { rect: [0, 0.58, 1, 0.42], slot: 1 },
    ],
  },
  trio: {
    label: 'Trio · comic three',
    panels: [
      { rect: [0, 0, 0.62, 1], slot: 0 },
      { rect: [0.62, 0, 0.38, 0.5], slot: 1 },
      { rect: [0.62, 0.5, 0.38, 0.5], slot: 2 },
    ],
  },
  quad: {
    label: 'Quad · four panels',
    panels: [
      { rect: [0, 0, 0.5, 0.5], slot: 0 },
      { rect: [0.5, 0, 0.5, 0.5], slot: 1 },
      { rect: [0, 0.5, 0.5, 0.5], slot: 2 },
      { rect: [0.5, 0.5, 0.5, 0.5], slot: 0 },
    ],
  },
};

/**
 * Colour grades. Each preset tints the photos with two overlay washes
 * (top and bottom), sets the caption colours and the frame colour, and
 * picks how strong the comic halftone dots read.
 */
export const PRESETS = {
  sunset: {
    label: 'Sunset',
    top: 'rgba(255, 122, 60, 0.16)',
    bottom: 'rgba(214, 38, 130, 0.34)',
    scrim: 'rgba(20, 6, 40, 0.72)',
    title: '#ffffff',
    titleStroke: '#160a24',
    accent: '#ffb347',
    frame: '#160a24',
    halftone: 0.16,
  },
  neon: {
    label: 'Neon Nights',
    top: 'rgba(0, 229, 255, 0.14)',
    bottom: 'rgba(255, 45, 149, 0.30)',
    scrim: 'rgba(6, 4, 28, 0.78)',
    title: '#ffffff',
    titleStroke: '#0a0618',
    accent: '#00e5ff',
    frame: '#0a0618',
    halftone: 0.22,
  },
  pastel: {
    label: 'Pastel Vice',
    top: 'rgba(255, 183, 213, 0.20)',
    bottom: 'rgba(64, 190, 200, 0.26)',
    scrim: 'rgba(48, 24, 64, 0.62)',
    title: '#fff7ef',
    titleStroke: '#3a1c4d',
    accent: '#ffd6e8',
    frame: '#3a1c4d',
    halftone: 0.12,
  },
  noir: {
    label: 'Noir',
    top: 'rgba(255, 255, 255, 0.05)',
    bottom: 'rgba(0, 0, 0, 0.42)',
    scrim: 'rgba(0, 0, 0, 0.80)',
    title: '#f5f5f5',
    titleStroke: '#000000',
    accent: '#e8e8e8',
    frame: '#000000',
    halftone: 0.28,
  },
};

/** Lettering styles for the caption. */
export const LETTERING = {
  block: { label: 'Block', glow: 0, outline: false },
  outline: { label: 'Outline', glow: 0, outline: true },
  neon: { label: 'Neon glow', glow: 1, outline: false },
};

/** Built-in sample photos, drawn from scratch by tools/generate-samples.py. */
export const SAMPLES = [
  { id: 'sunset', label: 'Sunset Bay', src: 'samples/sunset.jpg' },
  { id: 'neon', label: 'Neon City', src: 'samples/neon.jpg' },
  { id: 'palms', label: 'Palm Road', src: 'samples/palms.jpg' },
];

/** A fresh editor state: three sample photos already loaded, trio layout. */
export function defaultState() {
  return {
    sizeKey: 'portrait',
    layout: 'trio',
    preset: 'sunset',
    lettering: 'block',
    caption: 'Sunset Heist',
    subtitle: 'VICE CITY · 2026',
    badge: true,
    grain: true,
    halftone: true,
    activePanel: 0,
    photos: [
      { src: 'samples/sunset.jpg', zoom: 1, ox: 0, oy: 0, img: null },
      { src: 'samples/neon.jpg', zoom: 1, ox: 0, oy: 0, img: null },
      { src: 'samples/palms.jpg', zoom: 1, ox: 0, oy: 0, img: null },
    ],
  };
}
