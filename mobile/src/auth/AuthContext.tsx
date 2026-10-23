import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  apiFetch,
  setAuthToken,
  setUnauthorizedHandler,
} from '../api/client';
import { User } from '../api/types';
import { showMessage } from '../utils/dialog';
import { clearToken, getToken, setToken } from '../utils/storage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  status: AuthStatus;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const alertingUnauthorizedRef = useRef<boolean>(false);

  const signOut = useCallback(async (): Promise<void> => {
    setAuthToken(null);
    await clearToken();
    setStatus('signedOut');
  }, []);

  const signIn = useCallback(async (token: string): Promise<void> => {
    alertingUnauthorizedRef.current = false;
    setAuthToken(token);
    await setToken(token);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
      if (!alertingUnauthorizedRef.current) {
        alertingUnauthorizedRef.current = true;
        showMessage('Session expired', 'Session expired, please log in again');
        alertingUnauthorizedRef.current = false;
      }
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [signOut]);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth(): Promise<void> {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          if (active) {
            setStatus('signedOut');
          }
          return;
        }

        setAuthToken(storedToken);
        await apiFetch<{ user: User }>('/auth/me', { auth: true });

        if (active) {
          setStatus('signedIn');
        }
      } catch {
        setAuthToken(null);
        await clearToken();
        if (active) {
          setStatus('signedOut');
        }
      }
    }

    void bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      signIn,
      signOut,
    }),
    [status, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
