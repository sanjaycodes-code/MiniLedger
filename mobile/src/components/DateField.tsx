import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { formatDueDate, toDateString } from '../utils/dates';

export interface DateFieldProps {
  value: string;
  onChange: (v: string) => void;
  minimumDate?: string;
  error?: string;
  label: string;
}

function parseYmdToLocalDate(ymd: string | undefined): Date {
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const parts = ymd.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    return new Date(year, month, day);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function DateField({
  value,
  onChange,
  minimumDate,
  error,
  label,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const dateObj = useMemo(() => parseYmdToLocalDate(value), [value]);
  const minDateObj = useMemo(
    () => (minimumDate ? parseYmdToLocalDate(minimumDate) : parseYmdToLocalDate(undefined)),
    [minimumDate],
  );

  const handlePickerChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      onChange(toDateString(selectedDate));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}, currently ${formatDueDate(value)}`}
        style={[
          styles.datePressable,
          showPicker && !error ? styles.datePressableFocused : null,
          error ? styles.datePressableError : null,
        ]}
      >
        <Text style={styles.dateText}>{formatDueDate(value)}</Text>
        <Feather name="calendar" size={18} color={colors.mutedText} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {showPicker ? (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          minimumDate={minDateObj}
          onChange={handlePickerChange}
        />
      ) : null}
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
  datePressable: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  datePressableFocused: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md - 1,
  },
  datePressableError: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.danger,
    paddingHorizontal: spacing.md - 1,
  },
  dateText: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.danger,
  },
});
