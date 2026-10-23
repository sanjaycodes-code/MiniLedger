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
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const variantTextStyle =
    variant === 'secondary'
      ? styles.secondaryText
      : variant === 'danger'
        ? styles.dangerText
        : styles.primaryText;

  const spinnerColor =
    variant === 'secondary'
      ? colors.text
      : variant === 'danger'
        ? colors.danger
        : colors.white;

  const content = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <Text style={[styles.baseText, variantTextStyle]}>{title}</Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={(state) => {
        const hovered =
          'hovered' in state && typeof state.hovered === 'boolean'
            ? state.hovered
            : false;
        return [
          styles.pressableWrapper,
          isDisabled ? styles.disabledButton : styles.interactiveWeb,
          hovered && !isDisabled && styles.hoveredButton,
          state.pressed && !isDisabled && styles.pressedButton,
          style,
        ];
      }}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.baseInner}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.baseInner,
            variant === 'danger' ? styles.dangerButton : styles.secondaryButton,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  baseInner: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  interactiveWeb: Platform.select<ViewStyle>({
    web: {
      cursor: 'pointer',
    },
    default: {},
  }),
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerButton: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  disabledButton: {
    opacity: 0.5,
  },
  hoveredButton: {
    opacity: 0.94,
  },
  pressedButton: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  baseText: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.text,
  },
  dangerText: {
    color: colors.danger,
  },
});
