/**
 * EngiNear colors: graphite and safety orange.
 * `brand` is the orange used for buttons and highlights; HEADER is the graphite top bar.
 */
export const palette = {
  light: {
    brand: '#C2410C',
    brandDeep: '#9A3412',
    brandInk: '#7C2D12',
    brandSoft: '#FFEDD5',
    bg: '#F3F3F1',
    surface: '#FFFFFF',
    text: '#16191D',
    muted: '#565D66',
    line: '#DADCDF',
    ok: '#15803D',
    okSoft: '#E4F4E9',
    warn: '#A16207',
    warnSoft: '#FEF6DC',
    bad: '#C02626',
    badSoft: '#FDECEC',
    star: '#E89B00',
    onBrand: '#FFFFFF',
  },
  dark: {
    brand: '#FB8C3C',
    brandDeep: '#9A3412',
    brandInk: '#FFD3B0',
    brandSoft: '#3A2112',
    bg: '#0F1114',
    surface: '#181B20',
    text: '#ECEDEF',
    muted: '#A3A9B1',
    line: '#2C3138',
    ok: '#4ADE80',
    okSoft: '#11281A',
    warn: '#FACC15',
    warnSoft: '#2E2608',
    bad: '#F87171',
    badSoft: '#3A1515',
    star: '#F5B731',
    onBrand: '#FFFFFF',
  },
};

export type Colors = typeof palette.light;

/** Buttons always use this orange (white text passes contrast) so the brand reads the same in dark mode. */
export const BRAND = '#C2410C';
export const BRAND_DEEP = '#9A3412';
/** Bright accent for decoration only (never behind text). */
export const ACCENT = '#F97316';
/** Graphite top bar and hero panels. */
export const HEADER = '#1D232B';

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const space = (n: number) => n * 4;

export const AVATAR_COLORS = ['#C2410C', '#15803D', '#6D28D9', '#B91C1C', '#A16207', '#0E7490', '#334155', '#9D174D'];
export const colorFor = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
