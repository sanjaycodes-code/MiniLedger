import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LoanStatus } from '../api/types';
import { colors, radius, spacing, typography } from '../theme';
import { daysFromToday } from '../utils/dates';

export interface StatusPillProps {
  status: LoanStatus;
  dueDate: string;
}

export function StatusPill({ status, dueDate }: StatusPillProps) {
  const diffDays = daysFromToday(dueDate);

  if (status === 'repaid') {
    return (
      <View style={[styles.pill, styles.repaidPill]}>
        <Feather name="check-circle" size={12} color={colors.success} />
        <Text style={[styles.text, styles.repaidText]}>Repaid</Text>
      </View>
    );
  }

  if (status === 'overdue') {
    const overdueDays = Math.max(1, Math.abs(diffDays));
    const unit = overdueDays === 1 ? 'day' : 'days';
    return (
      <View style={[styles.pill, styles.overduePill]}>
        <Feather name="alert-circle" size={12} color={colors.danger} />
        <Text style={[styles.text, styles.overdueText]}>
          {`Overdue · ${overdueDays} ${unit}`}
        </Text>
      </View>
    );
  }

  const isDueSoon = diffDays <= 3;
  const label =
    diffDays <= 0
      ? 'Due today'
      : diffDays === 1
        ? 'Due in 1 day'
        : `Due in ${diffDays} days`;

  return (
    <View
      style={[
        styles.pill,
        isDueSoon ? styles.warningPill : styles.neutralPill,
      ]}
    >
      <Feather
        name="clock"
        size={12}
        color={isDueSoon ? colors.warning : colors.mutedText}
      />
      <Text
        style={[
          styles.text,
          isDueSoon ? styles.warningText : styles.neutralText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  repaidPill: {
    backgroundColor: colors.successBg,
  },
  repaidText: {
    color: colors.success,
  },
  overduePill: {
    backgroundColor: colors.dangerBg,
  },
  overdueText: {
    color: colors.danger,
  },
  warningPill: {
    backgroundColor: colors.warningBg,
  },
  warningText: {
    color: colors.warning,
  },
  neutralPill: {
    backgroundColor: colors.neutralPillBg,
  },
  neutralText: {
    color: colors.mutedText,
  },
});
