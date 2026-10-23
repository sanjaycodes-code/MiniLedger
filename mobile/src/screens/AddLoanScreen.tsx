import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError } from '../api/client';
import { createLoan, CreateLoanInput } from '../api/loans';
import { Button } from '../components/Button';
import { DateField } from '../components/DateField';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { addDays, toDateString } from '../utils/dates';
import { showMessage } from '../utils/dialog';
import { parseRupeesToMinor } from '../utils/money';

export interface LoanFormValues {
  friendName: string;
  amount: string;
  dueDate: string;
}

export interface LoanFormErrors {
  friendName?: string;
  amount?: string;
  dueDate?: string;
}

export type ValidateLoanFormResult =
  | { valid: true; payload: CreateLoanInput; errors: LoanFormErrors }
  | { valid: false; errors: LoanFormErrors };

export function validateLoanForm(
  values: LoanFormValues,
): ValidateLoanFormResult {
  const errors: LoanFormErrors = {};

  const trimmedName = values.friendName.trim();
  if (trimmedName.length === 0) {
    errors.friendName = 'Friend name is required';
  } else if (trimmedName.length > 60) {
    errors.friendName = 'Friend name must be at most 60 characters';
  }

  const amountMinor = parseRupeesToMinor(values.amount);
  if (amountMinor === null) {
    errors.amount = 'Enter a valid amount between ₹0.01 and ₹1,00,00,000';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate) || values.dueDate < '2000-01-01') {
    errors.dueDate = 'Select a valid due date';
  }

  if (
    errors.friendName !== undefined ||
    errors.amount !== undefined ||
    errors.dueDate !== undefined ||
    amountMinor === null
  ) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    payload: {
      friendName: trimmedName,
      amountMinor,
      dueDate: values.dueDate,
    },
    errors: {},
  };
}

type AddLoanNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddLoan'
>;

function getEndOfMonthDate(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

export function AddLoanScreen() {
  const navigation = useNavigation<AddLoanNavigationProp>();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const todayString = useMemo(() => toDateString(today), [today]);

  const quickDates = useMemo(
    () => [
      { label: '+7 days', value: toDateString(addDays(today, 7)) },
      { label: '+30 days', value: toDateString(addDays(today, 30)) },
      { label: 'End of month', value: toDateString(getEndOfMonthDate(today)) },
    ],
    [today],
  );

  const [friendName, setFriendName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(() =>
    toDateString(addDays(today, 30)),
  );
  const [errors, setErrors] = useState<LoanFormErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    if (submitting) {
      return;
    }

    const validation = validateLoanForm({
      friendName,
      amount,
      dueDate,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await createLoan(validation.payload);
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'VALIDATION_ERROR' && err.details) {
          const fieldErrors: LoanFormErrors = {};
          for (const detail of err.details) {
            if (detail.field === 'friendName') {
              fieldErrors.friendName = detail.message;
            } else if (detail.field === 'amountMinor') {
              fieldErrors.amount = detail.message;
            } else if (detail.field === 'dueDate') {
              fieldErrors.dueDate = detail.message;
            }
          }
          setErrors(fieldErrors);
        } else if (err.code === 'NETWORK_ERROR') {
          showMessage('Error', "Can't reach the server");
        } else {
          showMessage('Error', err.message);
        }
      } else {
        showMessage('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS !== 'web'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, shadow.card]}>
            <TextField
              label="Friend name"
              value={friendName}
              onChangeText={(text) => {
                setFriendName(text);
                if (errors.friendName) {
                  setErrors((prev) => ({ ...prev, friendName: undefined }));
                }
              }}
              maxLength={60}
              autoCapitalize="words"
              placeholder="e.g. Rahul Sharma"
              error={errors.friendName}
            />

            <TextField
              label="Amount"
              prefix="₹"
              largePrefix
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                if (errors.amount) {
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              keyboardType="decimal-pad"
              placeholder="2,500"
              style={styles.amountInput}
              error={errors.amount}
            />

            <DateField
              label="Due date"
              value={dueDate}
              minimumDate={todayString}
              error={errors.dueDate}
              onChange={(nextDate) => {
                setDueDate(nextDate);
                if (errors.dueDate) {
                  setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }
              }}
            />

            <View style={styles.quickPickRow}>
              {quickDates.map((chip) => {
                const selected = dueDate === chip.value;
                return (
                  <Pressable
                    key={chip.label}
                    onPress={() => {
                      setDueDate(chip.value);
                      if (errors.dueDate) {
                        setErrors((prev) => ({ ...prev, dueDate: undefined }));
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Set due date to ${chip.label}`}
                    accessibilityState={{ selected }}
                    style={(state) => {
                      const hovered =
                        'hovered' in state && typeof state.hovered === 'boolean'
                          ? state.hovered
                          : false;
                      return [
                        styles.quickChip,
                        selected && styles.quickChipSelected,
                        hovered && !selected && styles.quickChipHovered,
                      ];
                    }}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        selected && styles.quickChipTextSelected,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              title="Save entry"
              accessibilityLabel="Save entry"
              onPress={() => void handleSubmit()}
              loading={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '700',
  },
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  quickChipHovered: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  quickChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  quickChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.mutedText,
  },
  quickChipTextSelected: {
    color: colors.primary,
  },
});
