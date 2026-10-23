import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useServerWake } from '../hooks/useServerWake';
import { colors, radius, spacing, typography } from '../theme';

export function ServerWakeBanner() {
  const { showBanner, dismissBanner } = useServerWake();

  if (!showBanner) {
    return null;
  }

  return (
    <View
      style={styles.banner}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <ActivityIndicator size="small" color={colors.warning} />
      <Text style={styles.message}>
        Waking up the server (free hosting), this can take up to a minute...
      </Text>
      <Pressable
        onPress={dismissBanner}
        accessibilityRole="button"
        accessibilityLabel="Dismiss server wake-up notice"
        style={(state) => [
          styles.dismissButton,
          state.pressed && styles.dismissPressed,
        ]}
      >
        <Feather name="x" size={16} color={colors.mutedText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  message: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  dismissPressed: {
    opacity: 0.75,
  },
});
