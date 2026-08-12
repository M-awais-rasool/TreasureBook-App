/**
 * Layout constants lifted directly from newDesign/.
 *
 * The design is drawn at a fixed 278 x 598 phone (728 x 548 tablet) and every
 * element is positioned in absolute px against that. Rather than hand-convert
 * each number, keep the design's own values here and scale them at runtime —
 * `scale()` maps a design px onto the current screen at the same ratio.
 *
 * See newDesign/README.md § "Design sizes".
 */

/** The canvas every phone number below is measured against. */
export const DESIGN = {
  width: 278,
  height: 598,
} as const;

export const DESIGN_TABLET = {
  width: 728,
  height: 548,
} as const;

/** Book — the object itself, from `01-home-empty.html`. */
export const BOOK = {
  /** Outer wrapper, including the cover's 7px border. */
  width: 274,
  height: 256,
  /** Book sits at 45% of screen height, not dead centre. */
  centerYRatio: 0.45,
  /** Cover border thickness — the leather visible around the page block. */
  coverPadding: 7,
  /** Cover corner radii, clockwise from top-left. Deliberately asymmetric. */
  coverRadius: { tl: 8, tr: 36, br: 15, bl: 30 },
  /** Page block radii, inset one step from the cover. */
  pageRadius: { tl: 4, tr: 30, br: 10, bl: 24 },
  /** Spine band straddling the centre fold. */
  spineWidth: 26,
  /** Stitch dashes: 2px wide, inset 6px from each spine edge, 7px on/7px off. */
  stitch: { width: 2, inset: 6, dash: 7, verticalInset: 14 },
  /** Gold metal corner protectors — top-left and bottom-right only. */
  cornerTopLeft: 24,
  cornerBottomRight: 22,
  /** Ribbon bookmark hanging from the top of the spine. */
  ribbon: { width: 14, height: 72, top: -7, notchDepth: 0.2 },
  /** Contact shadow cast on the desk. */
  groundShadow: { width: 224, height: 24, bottom: -15, blur: 7 },
} as const;

/** Page interior — from `02-home-filled.html`. */
export const PAGE = {
  paddingTop: 16,
  paddingHorizontal: 14,
  /** Ruled lines: 17px clear, 1px rule. */
  ruleSpacing: 18,
  ruleThickness: 1,
  /** Red margin rule, 16px in from the outer edge. */
  marginInset: 16,
  /** Gutter shading where the page meets the spine. */
  gutterWidth: 16,
  pageNumber: { top: 9, inset: 10 },
  /** Empty sticker slot placeholder. */
  slot: { width: 98, height: 78, radius: { tl: 6, tr: 22, br: 8, bl: 18 } },
  sticker: { width: 98, height: 80, radius: 13, tiltDeg: -5 },
} as const;

/** Home chrome — header and capture button. */
export const HOME = {
  header: { top: 48, gap: 8 },
  title: { size: 23 },
  hintPill: { size: 11, paddingV: 5, paddingH: 15, radius: 20 },
  capture: {
    bottom: 44,
    paddingV: 14,
    paddingH: 26,
    radius: 30,
    gap: 9,
    iconSize: 20,
    labelSize: 16,
  },
} as const;

/** Camera layer — shared across all six states (`04`–`09`). */
export const CAMERA = {
  viewport: { top: 80, inset: 20, height: 356, radius: 26 },
  caption: { top: 452, size: 13, paddingV: 7, paddingH: 17, radius: 20 },
  close: { bottom: 46, left: 24, size: 50 },
  shutter: { bottom: 38, size: 70, border: 5 },
  /** Framing brackets over the preview. */
  bracket: { size: 34, inset: 26, thickness: 3, radius: 6 },
  /** Processing scan line. */
  scanLine: { height: 3, from: 0.06, to: 0.88 },
} as const;

/**
 * Sticker flight — reference arc from newDesign/README.md.
 * Quadratic curve in a 300 x 620 viewBox; the sticker shrinks across it.
 */
export const FLIGHT = {
  viewBox: { width: 300, height: 620 },
  start: { x: 150, y: 200 },
  control: { x: 262, y: 286 },
  end: { x: 208, y: 347 },
  widthFrom: 120,
  widthTo: 86,
} as const;

/** Motion — the CSS keyframes shipped in every design file. */
export const MOTION = {
  /** tbFloat — book idle, ±5px with a slight rotate. */
  float: { durationMs: 7000, translateY: 5, rotateDeg: 0.4 },
  /** tbPulse — camera framing brackets. */
  pulse: { durationMs: 2000, opacityFrom: 0.4, scaleFrom: 0.97 },
  /** tbScan — processing scan line, alternating. */
  scan: { durationMs: 1400 },
  /** tbTwinkle — sparkles, staggered 1.2–4.2s. */
  twinkle: { minMs: 1200, maxMs: 4200, opacityFrom: 0.25, scaleFrom: 0.8, scaleTo: 1.15 },
  /** tbPop — cut-out result pop-in. */
  pop: { durationMs: 1100, bezier: [0.2, 1.4, 0.4, 1] as const },
} as const;

/**
 * Builds a scaler for the current screen.
 *
 * The design is width-driven: the book and all chrome are sized against the
 * 278px canvas, so a single ratio keeps proportions intact. On tablets the
 * ratio is capped so the book gains margin instead of growing without limit —
 * per README § "Tablet · Home filled: book caps its width, gains margin".
 */
export function createScale(screenWidth: number, isLarge: boolean) {
  const raw = screenWidth / DESIGN.width;
  const ratio = isLarge ? Math.min(raw, DESIGN_TABLET.width / DESIGN.width / 1.6) : raw;
  return (designPx: number) => Math.round(designPx * ratio * 100) / 100;
}
