import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  prefix?: string;
  largePrefix?: boolean;
}

export function TextField({
  label,
  error,
  prefix,
  largePrefix = false,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const hasError = Boolean(error && error.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focused && !hasError && styles.inputWrapperFocused,
          hasError && styles.inputError,
        ]}
      >
        {prefix ? (
          <Text
            style={[
              styles.prefixText,
              largePrefix && styles.largePrefixText,
            ]}
          >
            {prefix}
          </Text>
        ) : null}
        <TextInput
          placeholderTextColor={colors.mutedText}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            prefix ? styles.inputWithPrefix : null,
            style,
          ]}
          {...inputProps}
        />
      </View>
      {hasError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputWrapperFocused: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md - 1,
    ...Platform.select<ViewStyle>({
      web: {
        boxShadow: `0 0 0 3px ${colors.focusRing}`,
      },
      default: {},
    }),
  },
  prefixText: {
    ...typography.heading,
    fontSize: 16,
    color: colors.mutedText,
    marginRight: spacing.xs,
  },
  largePrefixText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputWithPrefix: {
    paddingLeft: 0,
  },
  inputError: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.danger,
    paddingHorizontal: spacing.md - 1,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.danger,
  },
});
