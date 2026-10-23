import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ApiError } from '../api/client';
import { listLoans, LoanFilter } from '../api/loans';
import { getSummary } from '../api/summary';
import { Loan, Summary } from '../api/types';

export interface UseLedgerResult {
  loans: Loan[];
  summary: Summary | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useLedger(filter: LoanFilter): UseLedgerResult {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef<boolean>(true);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(
    async (
      activeFilter: LoanFilter,
      mode: 'load' | 'refresh' | 'silent',
    ): Promise<void> => {
      const requestId = ++requestIdRef.current;

      if (mode === 'load') {
        setLoading(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [fetchedLoans, fetchedSummary] = await Promise.all([
          listLoans(activeFilter),
          getSummary(),
        ]);

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setLoans(fetchedLoans);
        setSummary(fetchedSummary);
      } catch (err) {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        if (err instanceof ApiError) {
          setError(
            err.code === 'NETWORK_ERROR'
              ? "Can't reach the server"
              : err.message,
          );
        } else {
          setError('Failed to load ledger data');
        }
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void executeFetch(filter, summary === null ? 'load' : 'silent');
    }, [executeFetch, filter, summary === null]),
  );

  const refresh = useCallback(async (): Promise<void> => {
    await executeFetch(filter, 'refresh');
  }, [executeFetch, filter]);

  const reload = useCallback(async (): Promise<void> => {
    await executeFetch(filter, 'load');
  }, [executeFetch, filter]);

  return {
    loans,
    summary,
    loading,
    refreshing,
    error,
    refresh,
    reload,
  };
}
