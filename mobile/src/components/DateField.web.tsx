import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { toDateString } from '../utils/dates';

export interface DateFieldProps {
  value: string;
  onChange: (v: string) => void;
  minimumDate?: string;
  error?: string;
  label: string;
}

interface WebInputChangeEvent {
  target: {
    value: string;
  };
}

export function DateField({
  value,
  onChange,
  minimumDate,
  error,
  label,
}: DateFieldProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const todayStr = toDateString(new Date());
  const minStr = minimumDate ?? todayStr;

  const isHighlighted = Boolean(error || focused);

  const inputStyle: Record<string, string | number> = {
    width: '100%',
    minHeight: 52,
    boxSizing: 'border-box',
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    colorScheme: 'dark',
    borderWidth: isHighlighted ? 2 : 1,
    borderStyle: 'solid',
    borderColor: error
      ? colors.danger
      : focused
        ? colors.primary
        : colors.border,
    borderRadius: radius.md,
    paddingLeft: isHighlighted ? spacing.md - 1 : spacing.md,
    paddingRight: isHighlighted ? spacing.md - 1 : spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    fontFamily: typography.body.fontFamily ?? 'inherit',
    outline: 'none',
    boxShadow:
      focused && !error ? `0 0 0 3px ${colors.focusRing}` : 'none',
    cursor: 'pointer',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {React.createElement('input', {
        type: 'date',
        value,
        min: minStr,
        'aria-label': label,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        onChange: (e: WebInputChangeEvent) => {
          onChange(e.target.value);
        },
        style: inputStyle,
      })}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.danger,
  },
});
