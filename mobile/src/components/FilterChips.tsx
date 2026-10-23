import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LoanFilter } from '../api/loans';
import { SummaryCounts } from '../api/types';
import { colors, radius, spacing, typography } from '../theme';

export interface FilterChipsProps {
  selectedFilter: LoanFilter;
  onSelectFilter: (filter: LoanFilter) => void;
  counts?: SummaryCounts | null;
}

const FILTERS: ReadonlyArray<{
  value: LoanFilter;
  label: string;
  countKey: keyof SummaryCounts;
}> = [
  { value: 'all', label: 'All', countKey: 'total' },
  { value: 'open', label: 'Open', countKey: 'open' },
  { value: 'overdue', label: 'Overdue', countKey: 'overdue' },
  { value: 'repaid', label: 'Repaid', countKey: 'repaid' },
];

export function FilterChips({
  selectedFilter,
  onSelectFilter,
  counts,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {FILTERS.map((item) => {
        const active = item.value === selectedFilter;
        const count = counts ? counts[item.countKey] : 0;

        return (
          <Pressable
            key={item.value}
            onPress={() => onSelectFilter(item.value)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item.label} loans (${count})`}
            accessibilityState={{ selected: active }}
            style={(state) => {
              const hovered =
                'hovered' in state && typeof state.hovered === 'boolean'
                  ? state.hovered
                  : false;
              return [
                styles.chip,
                active ? styles.activeChip : styles.inactiveChip,
                hovered && !active && styles.hoveredChip,
              ];
            }}
          >
            <Text style={[styles.chipText, active && styles.activeChipText]}>
              {item.label}
            </Text>
            <View
              style={[
                styles.badge,
                active ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text
                style={[styles.badgeText, active && styles.activeBadgeText]}
              >
                {String(count)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  inactiveChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  hoveredChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.label,
    fontSize: 14,
    color: colors.text,
  },
  activeChipText: {
    color: colors.white,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBadge: {
    backgroundColor: colors.neutralPillBg,
  },
  activeBadge: {
    backgroundColor: colors.heroChipBg,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
  },
  activeBadgeText: {
    color: colors.white,
  },
});
