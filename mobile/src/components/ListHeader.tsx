import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LoanFilter } from '../api/loans';
import { Summary } from '../api/types';
import { spacing } from '../theme';
import { FilterChips } from './FilterChips';
import { SummaryCard } from './SummaryCard';

export interface ListHeaderProps {
  summary: Summary | null;
  loading: boolean;
  selectedFilter: LoanFilter;
  onSelectFilter: (filter: LoanFilter) => void;
}

export function ListHeader({
  summary,
  loading,
  selectedFilter,
  onSelectFilter,
}: ListHeaderProps) {
  return (
    <View style={styles.container}>
      <SummaryCard summary={summary} loading={loading} />
      <FilterChips
        selectedFilter={selectedFilter}
        onSelectFilter={onSelectFilter}
        counts={summary?.counts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
});
