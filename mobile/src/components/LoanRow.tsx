import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Loan } from '../api/types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { formatDueDate } from '../utils/dates';
import { confirmAction } from '../utils/dialog';
import { formatMinor } from '../utils/money';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';

export interface LoanRowProps {
  loan: Loan;
  onPress: (loan: Loan) => void;
  onRepay: (loan: Loan) => void;
  repaying: boolean;
  index?: number;
}

function buildDateCaption(loan: Loan): string {
  if (loan.status === 'repaid') {
    const datePart = loan.repaidAt ?? loan.dueDate;
    return `Repaid ${formatDueDate(datePart)}`;
  }
  return `Due ${formatDueDate(loan.dueDate)}`;
}

export function LoanRow({
  loan,
  onPress,
  onRepay,
  repaying,
  index = 0,
}: LoanRowProps) {
  const formattedAmount = formatMinor(loan.amountMinor);
  const dateCaption = buildDateCaption(loan);
  const isOverdue = loan.status === 'overdue';
  const isRepaid = loan.status === 'repaid';

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    let active = true;
    const clampedIndex = Math.min(index, 7);
    const delayMs = clampedIndex * 30;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (!active) {
          return;
        }
        if (reduceMotion) {
          opacityAnim.setValue(1);
          translateYAnim.setValue(0);
          return;
        }
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            delay: delayMs,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 200,
            delay: delayMs,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
      });

    return () => {
      active = false;
    };
  }, [index, opacityAnim, translateYAnim]);

  const handleConfirmRepay = async (): Promise<void> => {
    if (repaying) {
      return;
    }
    const confirmed = await confirmAction(
      'Mark as repaid',
      `Mark ${loan.friendName}'s ${formattedAmount} as repaid?`,
      'Mark repaid',
    );
    if (confirmed) {
      onRepay(loan);
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(loan)}
        accessibilityRole="button"
        accessibilityLabel={`View loan for ${loan.friendName}, ${formattedAmount}`}
        style={(state) => {
          const hovered =
            'hovered' in state && typeof state.hovered === 'boolean'
              ? state.hovered
              : false;
          return [
            styles.card,
            shadow.card,
            isOverdue && styles.overdueCard,
            isRepaid && styles.repaidCard,
            hovered && [styles.hoveredCard, shadow.cardHover],
            state.pressed && styles.pressedCard,
          ];
        }}
      >
        <View style={styles.mainRow}>
          <Avatar name={loan.friendName} size="md" />

          <View style={styles.infoColumn}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.friendName, isRepaid && styles.repaidText]}
                numberOfLines={1}
              >
                {loan.friendName}
              </Text>
              {loan.hasReceipt ? (
                <View
                  style={styles.receiptBadge}
                  accessibilityLabel="Has receipt"
                >
                  <Feather
                    name="paperclip"
                    size={13}
                    color={colors.primary}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <StatusPill status={loan.status} dueDate={loan.dueDate} />
              <Text style={styles.dateCaption} numberOfLines={1}>
                {dateCaption}
              </Text>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <Text
              style={[
                styles.amount,
                isOverdue && styles.overdueAmount,
                isRepaid && styles.repaidText,
              ]}
            >
              {formattedAmount}
            </Text>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.mutedText}
            />
          </View>
        </View>

        {!isRepaid ? (
          <View style={styles.bottomRow}>
            <Pressable
              onPress={() => void handleConfirmRepay()}
              disabled={repaying}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${loan.friendName}'s loan as repaid`}
              accessibilityState={{ disabled: repaying, busy: repaying }}
              style={(state) => {
                const hovered =
                  'hovered' in state && typeof state.hovered === 'boolean'
                    ? state.hovered
                    : false;
                return [
                  styles.repayChip,
                  hovered && !repaying && styles.repayChipHovered,
                  state.pressed && !repaying && styles.repayChipPressed,
                  repaying && styles.repayChipDisabled,
                ];
              }}
            >
              {repaying ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="check" size={14} color={colors.primary} />
                  <Text style={styles.repayChipText}>Mark repaid</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  overdueCard: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  repaidCard: {
    opacity: 0.72,
  },
  hoveredCard: {
    borderColor: colors.primaryBorder,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  friendName: {
    ...typography.heading,
    color: colors.text,
    flexShrink: 1,
  },
  receiptBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateCaption: {
    ...typography.caption,
    fontSize: 12,
    color: colors.mutedText,
  },
  rightColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amount: {
    ...typography.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  overdueAmount: {
    color: colors.danger,
  },
  repaidText: {
    color: colors.text,
  },
  bottomRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  repayChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  repayChipHovered: {
    borderColor: colors.primary,
  },
  repayChipPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  repayChipDisabled: {
    opacity: 0.5,
  },
  repayChipText: {
    ...typography.label,
    color: colors.primary,
  },
});
