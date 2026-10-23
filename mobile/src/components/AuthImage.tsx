import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { API_URL, getAuthToken } from '../api/client';
import { colors, radius, spacing, typography } from '../theme';

export interface AuthImageProps {
  loanId: string;
  version: number;
  style?: StyleProp<ImageStyle>;
  onError?: () => void;
}

export function AuthImage({
  loanId,
  version,
  style,
  onError,
}: AuthImageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);
  const [webObjectUrl, setWebObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setFailed(false);
      setLoading(true);
      return;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;

    async function fetchReceiptBlob(): Promise<void> {
      setLoading(true);
      setFailed(false);
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `${API_URL}/loans/${loanId}/receipt?v=${version}`,
          {
            method: 'GET',
            headers,
          },
        );

        if (!response.ok) {
          throw new Error(`Receipt fetch failed with status ${response.status}`);
        }

        const blob = await response.blob();
        if (cancelled) {
          return;
        }

        createdObjectUrl = URL.createObjectURL(blob);
        setWebObjectUrl(createdObjectUrl);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setFailed(true);
          onError?.();
        }
      }
    }

    void fetchReceiptBlob();

    return () => {
      cancelled = true;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [loanId, version, onError]);

  if (failed) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{"Couldn't load receipt"}</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {webObjectUrl ? (
          <Image
            key={webObjectUrl}
            accessibilityLabel="Loan receipt photo"
            source={{ uri: webObjectUrl }}
            style={[styles.image, style]}
            resizeMode="contain"
          />
        ) : null}
        {loading ? (
          <View style={styles.spinnerOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
    );
  }

  const token = getAuthToken();
  const nativeUri = token
    ? `${API_URL}/loans/${loanId}/receipt?v=${version}&token=${encodeURIComponent(token)}`
    : `${API_URL}/loans/${loanId}/receipt?v=${version}`;

  return (
    <View style={styles.wrapper}>
      <Image
        key={nativeUri}
        accessibilityLabel="Loan receipt photo"
        source={{
          uri: nativeUri,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }}
        style={[styles.image, style]}
        resizeMode="contain"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setFailed(true);
          onError?.();
        }}
      />
      {loading ? (
        <View style={styles.spinnerOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  spinnerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  errorBox: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
});
