import { Platform } from 'react-native';

// TOORA Brand Colors
export const Brand = {
  primary: '#2E75B6', // Route blue
  primaryDark: '#1A5A96',
  accent: '#E67E22', // Warm orange
  success: '#27AE60',
  warning: '#F1C40F',
  danger: '#E74C3C',
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};

// Route-specific colors
export const RouteColors = {
  routeLine: '#2E75B6',
  routeLineWidth: 4,
  offRouteWarning: '#E74C3C',
  userDot: '#4A90D9',
  hotspotActive: '#E67E22',
  hotspotVisited: '#27AE60',
  hotspotLocked: '#9CA3AF',
  hotspotWaypoint: '#D1D5DB',
  hotspotApproaching: '#F1C40F',
};

// Difficulty badge colors
export const DifficultyColors: Record<string, string> = {
  easy: '#27AE60',
  moderate: '#F1C40F',
  hard: '#E74C3C',
};

const tintColorLight = Brand.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    surface: '#F9FAFB',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1F2937',
    cardBorder: '#374151',
    surface: '#111827',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Touch target minimums for cycling use
export const TouchTarget = {
  minSize: 56, // dp — spec requirement for cycling gloves
} as const;
