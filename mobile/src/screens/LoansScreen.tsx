import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../api/client';
import { LoanFilter, repayLoan } from '../api/loans';
import { Loan } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { Header } from '../components/Header';
import { ListHeader } from '../components/ListHeader';
import { LoanRow } from '../components/LoanRow';
import { Screen } from '../components/Screen';
import { ServerWakeBanner } from '../components/ServerWakeBanner';
import { useLedger } from '../hooks/useLedger';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { showMessage } from '../utils/dialog';

type LoansNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Loans'
>;

function getEmptyCopy(
  filter: LoanFilter,
  totalCount: number,
): { title: string; hint: string; showCta: boolean } {
  if (filter === 'all' && totalCount === 0) {
    return {
      title: 'No loans yet',
      hint: 'Keep track of money you lend to friends and when it is due back.',
      showCta: true,
    };
  }
  switch (filter) {
    case 'open':
      return {
        title: 'No open loans',
        hint: 'All caught up! You have no upcoming open loans right now.',
        showCta: false,
      };
    case 'overdue':
      return {
        title: 'No overdue loans',
        hint: 'Great news — none of your lent entries are past their due date.',
        showCta: false,
      };
    case 'repaid':
      return {
        title: 'No repaid loans',
        hint: 'Loans marked as repaid will appear here for your records.',
        showCta: false,
      };
    default:
      return {
        title: 'No loans yet',
        hint: 'Keep track of money you lend to friends and when it is due back.',
        showCta: true,
      };
  }
}

export function LoansScreen() {
  const { signOut } = useAuth();
  const navigation = useNavigation<LoansNavigationProp>();
  const { width } = useWindowDimensions();
  const isExtendedFab = width > 480;

  const [filter, setFilter] = useState<LoanFilter>('all');
  const [repayingId, setRepayingId] = useState<string | null>(null);

  const { loans, summary, loading, refreshing, error, refresh, reload } =
    useLedger(filter);

  const handleRepay = async (loan: Loan): Promise<void> => {
    if (repayingId !== null) {
      return;
    }
    setRepayingId(loan.id);
    try {
      await repayLoan(loan.id);
      await reload();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_REPAID') {
          await reload();
        } else {
          showMessage('Error', err.message);
        }
      } else {
        showMessage('Error', 'Could not mark loan as repaid');
      }
    } finally {
      setRepayingId(null);
    }
  };

  const totalCount = summary?.counts.total ?? 0;
  const emptyCopy = getEmptyCopy(filter, totalCount);

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header onSignOut={() => void signOut()} />
        <ServerWakeBanner />

        {error ? (
          <View style={styles.fullCenter}>
            <ListHeader
              summary={summary}
              loading={loading}
              selectedFilter={filter}
              onSelectFilter={setFilter}
            />
            <View style={styles.centerContent}>
              <EmptyState
                icon="wifi-off"
                title="Couldn't load your ledger"
                hint={error}
                actionLabel="Retry"
                onAction={() => void reload()}
              />
            </View>
          </View>
        ) : (
          <FlatList
            data={loading ? [] : loans}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <ListHeader
                summary={summary}
                loading={loading}
                selectedFilter={filter}
                onSelectFilter={setFilter}
              />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <EmptyState
                  icon={filter === 'overdue' ? 'check-circle' : 'inbox'}
                  title={emptyCopy.title}
                  hint={emptyCopy.hint}
                  actionLabel={
                    emptyCopy.showCta ? 'Add your first entry' : undefined
                  }
                  onAction={
                    emptyCopy.showCta
                      ? () => navigation.navigate('AddLoan')
                      : undefined
                  }
                />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item, index }) => (
              <LoanRow
                loan={item}
                index={index}
                onPress={(selected) =>
                  navigation.navigate('LoanDetail', { loanId: selected.id })
                }
                onRepay={(selected) => void handleRepay(selected)}
                repaying={repayingId === item.id}
              />
            )}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new loan"
          onPress={() => navigation.navigate('AddLoan')}
          style={(state) => {
            const hovered =
              'hovered' in state && typeof state.hovered === 'boolean'
                ? state.hovered
                : false;
            return [
              styles.fabWrapper,
              shadow.fab,
              hovered && styles.fabHovered,
              state.pressed && styles.fabPressed,
            ];
          }}
        >
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.fabGradient,
              isExtendedFab ? styles.fabExtended : styles.fabCompact,
            ]}
          >
            <Feather name="plus" size={22} color={colors.white} />
            {isExtendedFab ? (
              <Text style={styles.fabLabel}>Add entry</Text>
            ) : null}
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 132,
  },
  fullCenter: {
    flex: 1,
    padding: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  fabWrapper: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radius.pill,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  fabHovered: {
    transform: [{ translateY: -1 }],
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  fabGradient: {
    minHeight: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fabCompact: {
    width: 56,
    height: 56,
  },
  fabExtended: {
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  fabLabel: {
    ...typography.heading,
    fontSize: 15,
    color: colors.white,
  },
});
