import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../api/client';

const WAKE_THRESHOLD_MS = 4000;
const RETRY_INTERVAL_MS = 3000;

export interface UseServerWakeResult {
  showBanner: boolean;
  dismissBanner: () => void;
}

async function pingHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function useServerWake(): UseServerWakeResult {
  const [waking, setWaking] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  const dismissBanner = useCallback((): void => {
    setDismissed(true);
  }, []);

  useEffect(() => {
    let active = true;
    let resolved = false;
    let thresholdTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRetry = (): void => {
      if (!active || resolved) {
        return;
      }
      retryTimer = setTimeout(() => {
        void (async () => {
          const ok = await pingHealth();
          if (!active || resolved) {
            return;
          }
          if (ok) {
            resolved = true;
            setWaking(false);
          } else {
            scheduleRetry();
          }
        })();
      }, RETRY_INTERVAL_MS);
    };

    thresholdTimer = setTimeout(() => {
      if (!active || resolved) {
        return;
      }
      setWaking(true);
      scheduleRetry();
    }, WAKE_THRESHOLD_MS);

    void (async () => {
      const ok = await pingHealth();
      if (!active || resolved) {
        return;
      }
      if (ok) {
        resolved = true;
        if (thresholdTimer) {
          clearTimeout(thresholdTimer);
          thresholdTimer = null;
        }
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        setWaking(false);
      }
    })();

    return () => {
      active = false;
      if (thresholdTimer) {
        clearTimeout(thresholdTimer);
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, []);

  return {
    showBanner: waking && !dismissed,
    dismissBanner,
  };
}
