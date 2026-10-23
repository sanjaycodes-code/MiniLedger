import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

export interface HeaderProps {
  onSignOut: () => void;
}

export function Header({ onSignOut }: HeaderProps) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Text style={styles.logoGlyph}>₹</Text>
        </View>
        <Text style={styles.wordmark}>MiniLedger</Text>
      </View>

      <Pressable
        onPress={onSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={(state) => {
          const hovered =
            'hovered' in state && typeof state.hovered === 'boolean'
              ? state.hovered
              : false;
          return [
            styles.signOutButton,
            hovered && styles.signOutHovered,
            state.pressed && styles.signOutPressed,
          ];
        }}
      >
        <Feather name="log-out" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: Platform.OS === 'web' ? colors.surfaceTranslucent : colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  wordmark: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  signOutHovered: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  signOutPressed: {
    opacity: 0.8,
  },
});
