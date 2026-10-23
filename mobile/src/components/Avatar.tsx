import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, typography } from '../theme';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
}

interface PaletteItem {
  bg: string;
  fg: string;
}

const AVATAR_PALETTE: ReadonlyArray<PaletteItem> = [
  { bg: 'rgba(99, 102, 241, 0.2)', fg: '#C7D2FE' },
  { bg: 'rgba(244, 114, 182, 0.18)', fg: '#FBCFE8' },
  { bg: 'rgba(56, 189, 248, 0.18)', fg: '#BAE6FD' },
  { bg: 'rgba(52, 211, 153, 0.18)', fg: '#A7F3D0' },
  { bg: 'rgba(251, 191, 36, 0.18)', fg: '#FDE68A' },
  { bg: 'rgba(192, 132, 252, 0.2)', fg: '#E9D5FF' },
];

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

function hashName(name: string): number {
  const normalized = name.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const SIZE_DIMENSIONS: Record<AvatarSize, { box: number; fontSize: number }> = {
  sm: { box: 36, fontSize: 13 },
  md: { box: 44, fontSize: 15 },
  lg: { box: 60, fontSize: 22 },
};

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = getInitials(name);
  const paletteIndex = hashName(name) % AVATAR_PALETTE.length;
  const palette = AVATAR_PALETTE[paletteIndex] ?? AVATAR_PALETTE[0]!;
  const dim = SIZE_DIMENSIONS[size];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          width: dim.box,
          height: dim.box,
          backgroundColor: palette.bg,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: dim.fontSize,
            color: palette.fg,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: typography.heading.fontFamily,
    fontWeight: '700',
  },
});
