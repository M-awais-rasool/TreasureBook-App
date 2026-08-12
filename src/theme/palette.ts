export const palette = {
  desk: {
    deep: '#211D18',
    mid: '#2E2620',
    warm: '#43362B',
    glow: '#8A5A38',
  },

  paper: {
    highlight: '#FFF9EC',
    base: '#FBF3E0',
    shade: '#F5E9CD',
    deepShade: '#EBD9B4',
    edge: '#D6C098',
  },

  ink: {
    primary: '#4A3B2E',
    soft: '#93826B',
    faint: '#B7A88E',
    rule: 'rgba(120, 150, 170, 0.30)',
    margin: 'rgba(214, 120, 110, 0.55)',
  },

  binding: {
    cloth: '#7B4321',
    clothDark: '#4E2911',
    clothLight: '#C07C46',
    thread: '#FBE3B4',
  },

  accent: {
    coral: '#F0937A',
    coralDeep: '#DE6E52',
    marigold: '#E6C264',
    gold: '#E6C264',
    sky: '#BCD8E6',
    sage: '#A9C9A4',
    teal: '#A9C9A4',
    lavender: '#C9BEE6',
  },

  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(24, 12, 8, 0.55)',
} as const;

export const coverGradient = {
  colors: ['#BE7742', '#8A4B27'] as const,
  angleDeg: 150,
};

export const spineGradient = {
  colors: ['#4E2911', '#7B4321', '#C07C46', '#7B4321', '#4E2911'] as const,
  locations: [0, 0.18, 0.5, 0.82, 1] as const,
};

export const cornerMetal = {
  topLeft: ['#EDD07E', '#C39733'] as const,
  bottomRight: ['#EDD07E', '#C39733'] as const,
};

export const ribbonGradient = ['#E6C264', '#CFA23A'] as const;
export const endpaperGradient = ['#E9D9B6', '#F1E4C6'] as const;

export const accentCycle = [
  palette.accent.gold,
  palette.accent.sage,
  palette.accent.coral,
  palette.accent.lavender,
  palette.accent.sky,
] as const;

export const accentAt = (index: number) =>
  accentCycle[((index % accentCycle.length) + accentCycle.length) % accentCycle.length];
