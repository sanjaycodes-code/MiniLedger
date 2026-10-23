import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { requestOtp, verifyOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { ServerWakeBanner } from '../components/ServerWakeBanner';
import { TextField } from '../components/TextField';
import { colors, radius, shadow, spacing, typography } from '../theme';

const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
const OTP_REGEX = /^\d{6}$/;
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_INDICES = [0, 1, 2, 3, 4, 5] as const;
const IS_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
const DEMO_PHONE_VALUE = '+919999999999';

type LoginStep = 'phone' | 'otp';

function mapAuthError(err: unknown): {
  fieldError?: string;
  bannerError?: string;
} {
  if (err instanceof ApiError) {
    if (err.code === 'INVALID_OTP') {
      return { fieldError: 'Wrong or expired code' };
    }
    if (err.code === 'RATE_LIMITED') {
      return { bannerError: 'Too many requests, wait a few seconds' };
    }
    if (err.code === 'VALIDATION_ERROR') {
      const detailMessage = err.details?.[0]?.message ?? err.message;
      return { fieldError: detailMessage };
    }
    if (err.code === 'NETWORK_ERROR') {
      return { bannerError: "Can't reach the server" };
    }
  }
  return { bannerError: 'Something went wrong. Please try again.' };
}

export function LoginScreen() {
  const { signIn } = useAuth();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 480;

  const [step, setStep] = useState<LoginStep>('phone');
  const [phoneInput, setPhoneInput] = useState<string>('+91');
  const [submittedPhone, setSubmittedPhone] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpFocused, setOtpFocused] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);

  const otpInputRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendOtp = async (): Promise<void> => {
    if (loading) {
      return;
    }
    setPhoneError(null);
    setBannerError(null);

    const normalized = phoneInput.replace(/\s+/g, '');
    if (!PHONE_REGEX.test(normalized)) {
      setPhoneError(
        'Enter a valid phone number with country code (e.g. +919876543210)',
      );
      return;
    }

    setLoading(true);
    try {
      await requestOtp(normalized);
      setSubmittedPhone(normalized);
      setOtpInput('');
      setOtpError(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (err) {
      const mapped = mapAuthError(err);
      if (mapped.fieldError) {
        setPhoneError(mapped.fieldError);
      }
      if (mapped.bannerError) {
        setBannerError(mapped.bannerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (): Promise<void> => {
    if (loading) {
      return;
    }
    setOtpError(null);
    setBannerError(null);

    if (!OTP_REGEX.test(otpInput)) {
      setOtpError('Enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp(submittedPhone, otpInput);
      await signIn(result.token);
    } catch (err) {
      const mapped = mapAuthError(err);
      if (mapped.fieldError) {
        setOtpError(mapped.fieldError);
      }
      if (mapped.bannerError) {
        setBannerError(mapped.bannerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (): Promise<void> => {
    if (cooldown > 0 || loading) {
      return;
    }
    setOtpError(null);
    setBannerError(null);
    setLoading(true);
    try {
      await requestOtp(submittedPhone);
      setOtpInput('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const mapped = mapAuthError(err);
      if (mapped.fieldError) {
        setOtpError(mapped.fieldError);
      }
      if (mapped.bannerError) {
        setBannerError(mapped.bannerError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = (): void => {
    setStep('phone');
    setOtpInput('');
    setOtpError(null);
    setBannerError(null);
  };

  const handleFillDemoNumber = (): void => {
    setPhoneInput(DEMO_PHONE_VALUE);
    if (phoneError) setPhoneError(null);
    if (bannerError) setBannerError(null);
  };

  const isOtpComplete = OTP_REGEX.test(otpInput);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS !== 'web'}
      >
        <ServerWakeBanner />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              isWideWeb ? [styles.wideCard, shadow.card] : styles.mobileCard,
            ]}
          >
            <View style={styles.brandBlock}>
              <View style={styles.logoMark}>
                <Text style={styles.logoGlyph}>₹</Text>
              </View>
              <Text style={styles.brandLabel}>MiniLedger</Text>
            </View>

            <Text style={styles.headline}>Track what you lend</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Sign in with your phone number to manage friendly IOUs, due dates, and receipts in one place.'
                : `Enter the 6-digit verification code sent to ${submittedPhone}`}
            </Text>

            {bannerError ? (
              <View style={styles.bannerErrorBox}>
                <Feather name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.bannerErrorText}>{bannerError}</Text>
              </View>
            ) : null}

            {step === 'phone' ? (
              <>
                <TextField
                  label="Phone Number"
                  value={phoneInput}
                  onChangeText={(text) => {
                    setPhoneInput(text);
                    if (phoneError) setPhoneError(null);
                    if (bannerError) setBannerError(null);
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="+919876543210"
                  error={phoneError}
                />

                {IS_DEMO_MODE ? (
                  <View style={styles.demoHintCard}>
                    <View style={styles.demoHintRow}>
                      <Feather name="info" size={15} color={colors.primary} />
                      <Text style={styles.demoHintText}>
                        Demo: use +919999999999, OTP 123456
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleFillDemoNumber}
                      accessibilityRole="button"
                      accessibilityLabel="Fill demo number"
                      style={(state) => {
                        const hovered =
                          'hovered' in state && typeof state.hovered === 'boolean'
                            ? state.hovered
                            : false;
                        return [
                          styles.demoFillButton,
                          hovered && styles.demoFillButtonHovered,
                          state.pressed && styles.demoFillButtonPressed,
                        ];
                      }}
                    >
                      <Text style={styles.demoFillButtonText}>
                        Fill demo number
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <Button
                  title="Send OTP"
                  accessibilityLabel="Send OTP"
                  onPress={() => void handleSendOtp()}
                  loading={loading}
                />
              </>
            ) : (
              <>
                <View style={styles.otpContainer}>
                  <Text style={styles.otpLabel}>One-Time Password (OTP)</Text>

                  <Pressable
                    onPress={() => otpInputRef.current?.focus()}
                    accessibilityRole="button"
                    accessibilityLabel="Enter 6-digit OTP code"
                    style={styles.otpBoxesRow}
                  >
                    {OTP_INDICES.map((idx) => {
                      const char = otpInput[idx] ?? '';
                      const isActiveBox =
                        otpFocused &&
                        (otpInput.length === idx ||
                          (otpInput.length === 6 && idx === 5));
                      const hasError = Boolean(otpError);

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.otpBox,
                            char.length > 0 && styles.otpBoxFilled,
                            isActiveBox && !hasError && styles.otpBoxActive,
                            hasError && styles.otpBoxError,
                          ]}
                        >
                          <Text style={styles.otpDigit}>{char}</Text>
                        </View>
                      );
                    })}

                    <TextInput
                      ref={otpInputRef}
                      value={otpInput}
                      onChangeText={(text) => {
                        const digitsOnly = text.replace(/\D+/g, '').slice(0, 6);
                        setOtpInput(digitsOnly);
                        if (otpError) setOtpError(null);
                        if (bannerError) setBannerError(null);
                      }}
                      onFocus={() => setOtpFocused(true)}
                      onBlur={() => setOtpFocused(false)}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      caretHidden
                      accessibilityLabel="One-Time Password 6-digit input"
                      style={styles.hiddenOtpInput}
                    />
                  </Pressable>

                  {otpError ? (
                    <Text style={styles.otpErrorText}>{otpError}</Text>
                  ) : null}
                </View>

                <Text style={styles.devHint}>
                  {IS_DEMO_MODE && submittedPhone === DEMO_PHONE_VALUE
                    ? 'Demo OTP: 123456'
                    : 'Mock OTP: check the backend server log'}
                </Text>

                <Button
                  title="Verify"
                  accessibilityLabel="Verify OTP"
                  onPress={() => void handleVerifyOtp()}
                  loading={loading}
                  disabled={!isOtpComplete}
                />

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={handleChangeNumber}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Change phone number"
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Change number</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleResendOtp()}
                    disabled={cooldown > 0 || loading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      cooldown > 0
                        ? `Resend OTP in ${cooldown} seconds`
                        : 'Resend OTP'
                    }
                    style={[
                      styles.linkButton,
                      (cooldown > 0 || loading) && styles.linkButtonDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.linkText,
                        (cooldown > 0 || loading) && styles.linkTextDisabled,
                      ]}
                    >
                      {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wideCard: {
    maxWidth: 420,
  },
  mobileCard: {
    maxWidth: '100%',
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    ...typography.title,
    fontSize: 20,
    color: colors.white,
  },
  brandLabel: {
    ...typography.heading,
    color: colors.primary,
  },
  headline: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.mutedText,
    marginBottom: spacing.lg,
  },
  bannerErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerErrorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
  },
  demoHintCard: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  demoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  demoHintText: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
  },
  demoFillButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  demoFillButtonHovered: {
    borderColor: colors.primary,
  },
  demoFillButtonPressed: {
    opacity: 0.85,
  },
  demoFillButtonText: {
    ...typography.label,
    fontSize: 12,
    color: colors.primary,
  },
  otpContainer: {
    marginBottom: spacing.md,
  },
  otpLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  otpBoxesRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.primaryBorder,
  },
  otpBoxActive: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  otpBoxError: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  otpDigit: {
    ...typography.title,
    fontSize: 20,
    color: colors.text,
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 16,
    color: colors.transparent,
  },
  otpErrorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.danger,
  },
  devHint: {
    ...typography.caption,
    color: colors.mutedText,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'pointer',
      },
      default: {},
    }),
  },
  linkButtonDisabled: {
    ...Platform.select<ViewStyle>({
      web: {
        cursor: 'auto',
      },
      default: {},
    }),
  },
  linkText: {
    ...typography.label,
    fontSize: 14,
    color: colors.primary,
  },
  linkTextDisabled: {
    color: colors.mutedText,
  },
});
