import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_STORAGE_KEY = 'miniledger_token';

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_STORAGE_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      }
      return;
    }
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage failures must not crash the app
  }
}

export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    // Storage failures must not crash the app
  }
}
