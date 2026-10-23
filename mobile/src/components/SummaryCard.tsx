import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Summary } from '../api/types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { formatMinor } from '../utils/money';

export interface SummaryCardProps {
  summary: Summary | null;
  loading: boolean;
}

export function SummaryCard({ summary, loading }: SummaryCardProps) {
  const pulseAnim = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (!loading || summary !== null) {
      return;
    }

    let animation: Animated.CompositeAnimation | null = null;
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (!active || reduceMotion) {
          pulseAnim.setValue(0.75);
          return;
        }
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.95,
              duration: 700,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(pulseAnim, {
              toValue: 0.45,
              duration: 700,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        );
        animation.start();
      });

    return () => {
      active = false;
      animation?.stop();
    };
  }, [loading, summary, pulseAnim]);

  if (loading && summary === null) {
    return (
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, shadow.card]}
      >
        <Animated.View style={{ opacity: pulseAnim }}>
          <View style={styles.skeletonLabel} />
          <View style={styles.skeletonHero} />
          <View style={styles.skeletonProgress} />
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <View style={styles.skeletonTileLabel} />
              <View style={styles.skeletonTileValue} />
            </View>
            <View style={styles.statTile}>
              <View style={styles.skeletonTileLabel} />
              <View style={styles.skeletonTileValue} />
            </View>
            <View style={styles.statTile}>
              <View style={styles.skeletonTileLabel} />
              <View style={styles.skeletonTileValue} />
            </View>
          </View>
          <View style={styles.skeletonCaption} />
        </Animated.View>
      </LinearGradient>
    );
  }

  const outstandingMinor = summary?.outstandingMinor ?? 0;
  const totalLentMinor = summary?.totalLentMinor ?? 0;
  const totalRepaidMinor = summary?.totalRepaidMinor ?? 0;
  const overdueMinor = summary?.overdueMinor ?? 0;
  const counts = summary?.counts ?? {
    total: 0,
    open: 0,
    overdue: 0,
    repaid: 0,
  };

  const repaidPercent =
    totalLentMinor > 0
      ? Math.min(100, Math.max(0, Math.round((totalRepaidMinor / totalLentMinor) * 100)))
      : 0;

  const hasOverdue = overdueMinor > 0;

  return (
    <LinearGradient
      colors={[colors.heroGradientStart, colors.heroGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow.card]}
    >
      <View style={styles.topRow}>
        <Text style={styles.heroLabel}>Outstanding</Text>
        <Text style={styles.progressCaption}>{`${repaidPercent}% repaid`}</Text>
      </View>

      <Text style={styles.heroAmount}>{formatMinor(outstandingMinor)}</Text>

      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: repaidPercent }}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${repaidPercent}%` },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <View style={styles.statHeader}>
            <Feather name="arrow-up-right" size={13} color={colors.heroLabel} />
            <Text style={styles.statLabel} numberOfLines={1}>
              Total lent
            </Text>
          </View>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatMinor(totalLentMinor)}
          </Text>
        </View>

        <View style={styles.statTile}>
          <View style={styles.statHeader}>
            <Feather name="check-circle" size={13} color={colors.heroLabel} />
            <Text style={styles.statLabel} numberOfLines={1}>
              Repaid
            </Text>
          </View>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatMinor(totalRepaidMinor)}
          </Text>
        </View>

        <View style={[styles.statTile, hasOverdue && styles.overdueTile]}>
          <View style={styles.statHeader}>
            <Feather
              name="alert-triangle"
              size={13}
              color={hasOverdue ? colors.heroOverdueText : colors.heroLabel}
            />
            <Text
              style={[styles.statLabel, hasOverdue && styles.overdueText]}
              numberOfLines={1}
            >
              Overdue
            </Text>
          </View>
          <Text
            style={[styles.statValue, hasOverdue && styles.overdueText]}
            numberOfLines={1}
          >
            {formatMinor(overdueMinor)}
          </Text>
        </View>
      </View>

      <Text style={styles.caption}>
        {`${counts.open} open · ${counts.overdue} overdue · ${counts.repaid} repaid`}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    ...typography.label,
    color: colors.heroLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressCaption: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  heroAmount: {
    ...typography.display,
    color: colors.white,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.heroTrackBg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.heroChipBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.heroChipBorder,
  },
  overdueTile: {
    backgroundColor: colors.heroOverdueBg,
    borderColor: colors.heroOverdueBorder,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.heroLabel,
    flexShrink: 1,
  },
  statValue: {
    ...typography.heading,
    fontSize: 15,
    color: colors.white,
  },
  overdueText: {
    color: colors.heroOverdueText,
  },
  caption: {
    ...typography.caption,
    color: colors.heroLabel,
    textAlign: 'center',
  },
  skeletonLabel: {
    width: 96,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.heroTrackBg,
    marginBottom: spacing.sm,
  },
  skeletonHero: {
    width: 170,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.heroTrackBg,
    marginBottom: spacing.md,
  },
  skeletonProgress: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.heroTrackBg,
    marginBottom: spacing.md,
  },
  skeletonTileLabel: {
    width: '65%',
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.heroTrackBg,
    marginBottom: spacing.xs,
  },
  skeletonTileValue: {
    width: '80%',
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.heroTrackBg,
  },
  skeletonCaption: {
    width: 180,
    height: 13,
    borderRadius: radius.sm,
    backgroundColor: colors.heroTrackBg,
    alignSelf: 'center',
  },
});
