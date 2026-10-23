import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ApiError } from '../api/client';
import { getLoan, repayLoan, uploadReceipt } from '../api/loans';
import { Loan } from '../api/types';
import { AuthImage } from '../components/AuthImage';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';
import { StatusPill } from '../components/StatusPill';
import { RootStackParamList } from '../navigation/types';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { formatDueDate } from '../utils/dates';
import { confirmAction, showMessage } from '../utils/dialog';
import { formatMinor } from '../utils/money';

type LoanDetailRouteProp = RouteProp<RootStackParamList, 'LoanDetail'>;

function mapUploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413 || err.code === 'FILE_TOO_LARGE') {
      return 'Photo is over 5 MB';
    }
    if (err.status === 415 || err.code === 'UNSUPPORTED_MEDIA_TYPE') {
      return 'Only JPEG, PNG or WebP photos are allowed';
    }
    if (err.code === 'NETWORK_ERROR') {
      return "Can't reach the server";
    }
    return err.message;
  }
  return 'Could not upload receipt photo';
}

export function LoanDetailScreen() {
  const route = useRoute<LoanDetailRouteProp>();
  const { loanId } = route.params;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [repaying, setRepaying] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [receiptVersion, setReceiptVersion] = useState<number>(1);

  const loadLoan = useCallback(async (): Promise<void> => {
    setError(null);
    setLoading(true);
    try {
      const fetched = await getLoan(loanId);
      setLoan(fetched);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === 'NETWORK_ERROR'
            ? "Can't reach the server"
            : err.message,
        );
      } else {
        setError('Failed to load entry');
      }
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    void loadLoan();
  }, [loadLoan]);

  const handleConfirmRepay = async (): Promise<void> => {
    if (!loan || repaying) {
      return;
    }
    const formattedAmount = formatMinor(loan.amountMinor);
    const confirmed = await confirmAction(
      'Mark as repaid',
      `Mark ${loan.friendName}'s ${formattedAmount} as repaid?`,
      'Mark repaid',
    );
    if (confirmed) {
      await handleRepay();
    }
  };

  const handleRepay = async (): Promise<void> => {
    if (!loan || repaying) {
      return;
    }
    setRepaying(true);
    try {
      const updated = await repayLoan(loan.id);
      setLoan(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_REPAID') {
          await loadLoan();
        } else {
          showMessage('Error', err.message);
        }
      } else {
        showMessage('Error', 'Could not mark loan as repaid');
      }
    } finally {
      setRepaying(false);
    }
  };

  const handleUploadAsset = async (
    asset: ImagePicker.ImagePickerAsset,
  ): Promise<void> => {
    if (!loan || uploading) {
      return;
    }
    setUploading(true);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const updated = await uploadReceipt(loan.id, {
        uri: asset.uri,
        mimeType,
      });
      setLoan(updated);
      setReceiptVersion((v) => v + 1);
    } catch (err) {
      showMessage('Upload Failed', mapUploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async (): Promise<void> => {
    if (uploading) {
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showMessage(
        'Camera Permission Required',
        'Please allow camera access in your device settings to take a receipt photo.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUploadAsset(result.assets[0]);
    }
  };

  const handleChooseFromLibrary = async (): Promise<void> => {
    if (uploading) {
      return;
    }
    if (Platform.OS !== 'web') {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage(
          'Photo Library Permission Required',
          'Please allow photo library access in your device settings to choose a receipt photo.',
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await handleUploadAsset(result.assets[0]);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !loan) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <EmptyState
            icon="alert-circle"
            title="Couldn't load entry"
            hint={error ?? 'Loan not found'}
            actionLabel="Retry"
            onAction={() => void loadLoan()}
          />
        </View>
      </Screen>
    );
  }

  const isOverdue = loan.status === 'overdue';
  const isRepaid = loan.status === 'repaid';

  const chooseLabel =
    Platform.OS === 'web'
      ? loan.hasReceipt
        ? 'Choose file to replace'
        : 'Choose file'
      : loan.hasReceipt
        ? 'Choose from library to replace'
        : 'Choose from library';

  return (
    <Screen>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.detailCard,
              shadow.card,
              isOverdue && styles.overdueCard,
            ]}
          >
            <View style={styles.heroHeader}>
              <Avatar name={loan.friendName} size="lg" />
              <Text style={styles.friendName}>{loan.friendName}</Text>
              <Text
                style={[
                  styles.amount,
                  isOverdue && styles.overdueAmount,
                ]}
              >
                {formatMinor(loan.amountMinor)}
              </Text>
              <StatusPill status={loan.status} dueDate={loan.dueDate} />
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due date</Text>
              <Text
                style={[
                  styles.metaValue,
                  isOverdue && styles.overdueText,
                ]}
              >
                {formatDueDate(loan.dueDate)}
              </Text>
            </View>

            {loan.repaidAt ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Repaid on</Text>
                <Text style={styles.metaValue}>
                  {formatDueDate(loan.repaidAt)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.receiptCard, shadow.card]}>
            <View style={styles.sectionHeaderRow}>
              <Feather name="paperclip" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {loan.hasReceipt ? 'Receipt (Replace receipt)' : 'Receipt'}
              </Text>
            </View>

            {loan.hasReceipt ? (
              <View style={styles.imageContainer}>
                <AuthImage
                  loanId={loan.id}
                  version={receiptVersion}
                  style={styles.receiptImage}
                />
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <View style={styles.placeholderIconCircle}>
                  <Feather name="image" size={22} color={colors.mutedText} />
                </View>
                <Text style={styles.placeholderTitle}>No receipt yet</Text>
                <Text style={styles.placeholderText}>
                  Attach a screenshot or photo of the payment receipt
                </Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              {Platform.OS !== 'web' ? (
                <Pressable
                  onPress={() => void handleTakePhoto()}
                  disabled={uploading}
                  accessibilityRole="button"
                  accessibilityLabel={
                    loan.hasReceipt
                      ? 'Take photo to replace receipt'
                      : 'Take photo of receipt'
                  }
                  accessibilityState={{ disabled: uploading, busy: uploading }}
                  style={(state) => [
                    styles.iconActionButton,
                    state.pressed && !uploading && styles.iconActionPressed,
                    uploading && styles.iconActionDisabled,
                  ]}
                >
                  <Feather name="camera" size={18} color={colors.text} />
                  <Text style={styles.iconActionText}>
                    {loan.hasReceipt ? 'Take photo to replace' : 'Take photo'}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => void handleChooseFromLibrary()}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel={
                  loan.hasReceipt
                    ? 'Choose receipt photo to replace existing receipt'
                    : 'Choose receipt photo'
                }
                accessibilityState={{ disabled: uploading, busy: uploading }}
                style={(state) => {
                  const hovered =
                    'hovered' in state && typeof state.hovered === 'boolean'
                      ? state.hovered
                      : false;
                  return [
                    styles.iconActionButton,
                    hovered && !uploading && styles.iconActionHovered,
                    state.pressed && !uploading && styles.iconActionPressed,
                    uploading && styles.iconActionDisabled,
                  ];
                }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Feather name="upload" size={18} color={colors.primary} />
                    <Text style={styles.iconActionText}>{chooseLabel}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {!isRepaid ? (
          <View style={styles.bottomBar}>
            <Button
              title="Mark repaid"
              accessibilityLabel={`Mark ${loan.friendName}'s loan as repaid`}
              onPress={() => void handleConfirmRepay()}
              loading={repaying}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overdueCard: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  heroHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendName: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  amount: {
    ...typography.display,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  overdueAmount: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    ...typography.body,
    color: colors.mutedText,
  },
  metaValue: {
    ...typography.heading,
    fontSize: 15,
    color: colors.text,
  },
  overdueText: {
    color: colors.danger,
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  imageContainer: {
    width: '100%',
    height: 260,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    minHeight: 168,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  placeholderIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  placeholderTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.mutedText,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  iconActionButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  iconActionHovered: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  iconActionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconActionDisabled: {
    opacity: 0.5,
  },
  iconActionText: {
    ...typography.heading,
    fontSize: 15,
    color: colors.text,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
