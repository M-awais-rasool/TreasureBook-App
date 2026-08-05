export const palette = {
  desk: {
    deep: '#1B1210',
    mid: '#2E1E18',
    warm: '#43291F',
    glow: '#8A5A38',
  },

  /** Paper stock — sampled from a 1950s school exercise book */
  paper: {
    highlight: '#FBF3E2',
    base: '#F3E7CE',
    shade: '#E4D3B2',
    deepShade: '#C9B58E',
    edge: '#B49B72',
  },

  /** Ink and printed rules */
  ink: {
    primary: '#3B2C24',
    soft: '#6B5646',
    faint: 'rgba(59, 44, 36, 0.28)',
    rule: 'rgba(96, 126, 150, 0.34)',
    margin: 'rgba(196, 96, 92, 0.38)',
  },

  /** Binding — cloth spine and stitching */
  binding: {
    cloth: '#5E3A2C',
    clothDark: '#3A231A',
    clothLight: '#7C4F3B',
    thread: '#E8D5B4',
  },

  /** Playful accents, used sparingly so the app stays premium rather than loud */
  accent: {
    coral: '#FF7A66',
    marigold: '#FFC24B',
    teal: '#3FBFAE',
    lavender: '#A98CE8',
    sky: '#6FB6F2',
  },

  /** Pure utilities */
  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(24, 12, 8, 0.55)',
} as const;

/** Ordered accent ring used to tint sparkles, slot outlines and confetti. */
export const accentCycle = [
  palette.accent.marigold,
  palette.accent.teal,
  palette.accent.coral,
  palette.accent.lavender,
  palette.accent.sky,
] as const;

export const accentAt = (index: number) =>
  accentCycle[((index % accentCycle.length) + accentCycle.length) % accentCycle.length];
