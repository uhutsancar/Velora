/**
 * Velora marka jetonlari — tek kaynak.
 *
 * Bu dosya bilerek bagimsizdir: hicbir sey import etmez ve yalnizca duz veri
 * ihrac eder. Boylece hem Tailwind config'i (Node tarafinda, derleme oncesi)
 * hem de MUI temasi (tarayicida, calisma aninda) ayni degerleri okuyabilir.
 *
 * Bir marka rengini degistirmek icin dokunulacak tek yer burasidir; storefront
 * Tailwind'i, admin Tailwind'i ve admin MUI temasi uclu de buradan turer.
 */

/** Sicak, siyaha yakin ana renk — markanin omurgasi. */
export const ink = {
  50: '#F6F5F3',
  100: '#E9E7E3',
  200: '#D2CEC7',
  300: '#B0AAA0',
  400: '#847D72',
  500: '#5E5850',
  600: '#443F39',
  700: '#302C28',
  800: '#1E1B18',
  900: '#12100E',
  950: '#0A0908',
} as const;

/** Tabaklanmis deri vurgusu — ikincil renk. */
export const tan = {
  50: '#FBF6F0',
  100: '#F4E9DA',
  200: '#E8D2B4',
  300: '#D9B486',
  400: '#C9945B',
  500: '#B87A3F',
  600: '#9C6133',
  700: '#7D4B2C',
  800: '#663E29',
  900: '#553524',
} as const;

/** Kagit/kum tonlari — storefront zeminleri. */
export const sand = {
  50: '#FDFCFA',
  100: '#F7F4EF',
  200: '#EFE9E0',
  300: '#E2D9CB',
} as const;

/** Durum renkleri. Admin bunlari success/danger adiyla yeniden ihrac eder. */
export const moss = { 100: '#E3EFE7', 500: '#3F5A46', 600: '#324A39' } as const;
export const wine = { 100: '#F6E6E9', 500: '#7A2E3C', 600: '#5C1F2B' } as const;

/** Admin'in yogun veri yuzeyleri. */
export const surface = {
  DEFAULT: '#FFFFFF',
  muted: '#F7F7F6',
  sunken: '#EFEEEC',
} as const;

export const fontFamily = {
  display: ['"Bodoni Moda"', 'Georgia', 'Cambria', 'serif'],
  sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
} as const;

/** MUI ve CSS'in tek string bekledigi yerler icin hazir birlestirilmis hali. */
export const fontStack = {
  display: fontFamily.display.join(', '),
  sans: fontFamily.sans.join(', '),
  mono: fontFamily.mono.join(', '),
} as const;

export const tokens = { ink, tan, sand, moss, wine, surface, fontFamily, fontStack } as const;
