export const colors = {
  background: '#F5F9F6',
  surface: '#FFFFFF',
  primary: '#146B4B',
  primaryDark: '#18392B',
  textPrimary: '#18392B',
  textSecondary: '#65766C',
  textMuted: '#75847A',
  border: '#E1EAE4',
  safe: '#146B4B',
  moderate: '#D4A017',
  danger: '#C83F43',
  sosRed: '#C83F43',
} as const;

export const radius = {
  card: 16,
  cardLarge: 20,
  pill: 14,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
} as const;

export const typography = {
  title: {
    fontSize: 25,
    fontWeight: '800' as const,
  },
  heading: {
    fontSize: 19,
    fontWeight: '800' as const,
  },
  body: {
    fontSize: 14,
  },
  caption: {
    fontSize: 12,
  },
} as const;

export const theme = {
  colors,
  radius,
  spacing,
  typography,
} as const;

export type Theme = typeof theme;
