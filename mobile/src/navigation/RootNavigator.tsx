import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { AddLoanScreen } from '../screens/AddLoanScreen';
import { LoanDetailScreen } from '../screens/LoanDetailScreen';
import { LoansScreen } from '../screens/LoansScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { colors, typography } from '../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      documentTitle={{ formatter: () => 'MiniLedger' }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: typography.heading.fontFamily,
            fontWeight: '600',
            color: colors.text,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {status === 'signedOut' ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Loans"
              component={LoansScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddLoan"
              component={AddLoanScreen}
              options={{ title: 'Add entry' }}
            />
            <Stack.Screen
              name="LoanDetail"
              component={LoanDetailScreen}
              options={{ title: 'Entry' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
