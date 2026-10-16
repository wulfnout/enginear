import { Platform } from 'react-native';

/**
 * EngiNear colors: orange, gray and white.
 * `brand` is the orange (#EB692B) used for the header, buttons and highlights.
 */
export const palette = {
  light: {
    brand: '#EB692B',
    brandDeep: '#C4521C',
    brandInk: '#8A3510',
    brandSoft: '#FDE9DD',
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1F2328',
    muted: '#5F6670',
    line: '#E2E4E8',
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
    brand: '#F28A52',
    brandDeep: '#C4521C',
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

/** Header and buttons always use this orange so the brand reads the same in dark mode. */
export const BRAND = '#EB692B';
export const BRAND_DEEP = '#C4521C';
/** Bright accent for decoration only (never behind text). */
export const ACCENT = '#EB692B';
/** Dark gray for hero panels and banners. */
export const HEADER = '#2E3238';

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const space = (n: number) => n * 4;

export const AVATAR_COLORS = ['#EB692B', '#15803D', '#6D28D9', '#B91C1C', '#A16207', '#0E7490', '#334155', '#9D174D'];
export const colorFor = (id: string) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

/** App font: Avenir Next on iPhone (bold, rounded, retail-style), the system sans-serif on Android. */
export const FONT = Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: undefined });
/** Light gray band under the header (like a store app's department strip). */
export const BAND = '#F2F3F5';
/** Light gray for card backgrounds that sit on white. */
export const GRAY_SOFT = '#F6F7F8';
