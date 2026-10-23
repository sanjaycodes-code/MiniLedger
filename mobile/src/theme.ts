import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#0B1220',
  surface: '#131C2E',
  surfaceRaised: '#1A2438',
  surfaceSubtle: '#1A2438',
  surfaceTranslucent: 'rgba(11, 18, 32, 0.86)',
  border: '#263248',
  text: '#E8EDF7',
  mutedText: '#94A3B8',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryDeep: '#4338CA',
  primaryLight: '#818CF8',
  primarySoft: 'rgba(99, 102, 241, 0.16)',
  primaryBorder: 'rgba(99, 102, 241, 0.42)',
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.12)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.12)',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.38)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.12)',
  warningBorder: 'rgba(251, 191, 36, 0.35)',
  neutralPillBg: '#1A2438',
  white: '#FFFFFF',
  transparent: 'rgba(0, 0, 0, 0)',
  heroGradientStart: '#4338CA',
  heroGradientEnd: '#6366F1',
  heroLabel: '#E0E7FF',
  heroChipBg: 'rgba(11, 18, 32, 0.28)',
  heroChipBorder: 'rgba(255, 255, 255, 0.18)',
  heroTrackBg: 'rgba(11, 18, 32, 0.36)',
  heroOverdueBg: 'rgba(220, 38, 38, 0.36)',
  heroOverdueBorder: 'rgba(254, 202, 202, 0.5)',
  heroOverdueText: '#FEE2E2',
  focusRing: 'rgba(99, 102, 241, 0.28)',
  overlay: 'rgba(11, 18, 32, 0.76)',
  scrollbarThumb: '#263248',
  scrollbarTrack: '#0B1220',
  selectionBg: 'rgba(99, 102, 241, 0.35)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
  full: 999,
} as const;

const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  android: {
    elevation: 3,
  },
  web: {
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
  },
  default: {},
});

const cardHoverShadow: ViewStyle = Platform.select<ViewStyle>({
  web: {
    boxShadow: '0 10px 28px rgba(0, 0, 0, 0.52)',
    transform: [{ translateY: -1 }],
  },
  default: {},
});

const fabShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  android: {
    elevation: 8,
  },
  web: {
    boxShadow: '0 8px 28px rgba(99, 102, 241, 0.45)',
  },
  default: {},
});

export const shadow = {
  card: cardShadow,
  cardHover: cardHoverShadow,
  fab: fabShadow,
} as const;

const fontRegular = Platform.select({
  web: 'Inter_400Regular, Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter_400Regular',
});

const fontMedium = Platform.select({
  web: 'Inter_500Medium, Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter_500Medium',
});

const fontSemiBold = Platform.select({
  web: 'Inter_600SemiBold, Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter_600SemiBold',
});

const fontBold = Platform.select({
  web: 'Inter_700Bold, Inter, system-ui, -apple-system, sans-serif',
  default: 'Inter_700Bold',
});

export const typography: Record<
  'display' | 'title' | 'heading' | 'body' | 'caption' | 'label',
  TextStyle
> = {
  display: {
    fontFamily: fontBold,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  title: {
    fontFamily: fontBold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  heading: {
    fontFamily: fontSemiBold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontFamily: fontRegular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontMedium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  label: {
    fontFamily: fontSemiBold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  shadow,
  typography,
} as const;
