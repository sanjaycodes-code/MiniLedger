import { Platform } from 'react-native';
import { apiFetch } from './client';
import { Loan, LoanStatus } from './types';

export type LoanFilter = 'all' | LoanStatus;

export interface CreateLoanInput {
  friendName: string;
  amountMinor: number;
  dueDate: string;
}

export interface ReceiptUploadFile {
  uri: string;
  mimeType: string;
}

interface ReactNativeFormDataFile {
  uri: string;
  name: string;
  type: string;
}

function normalizeImageMimeType(
  mimeType: string,
  uri: string,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  const lowerMime = mimeType.trim().toLowerCase();
  if (lowerMime === 'image/png') {
    return 'image/png';
  }
  if (lowerMime === 'image/webp') {
    return 'image/webp';
  }
  if (lowerMime === 'image/jpeg' || lowerMime === 'image/jpg') {
    return 'image/jpeg';
  }

  const cleanUri = uri.split('?')[0]?.toLowerCase() ?? '';
  if (cleanUri.endsWith('.png')) {
    return 'image/png';
  }
  if (cleanUri.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function extensionForMime(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower === 'image/png') {
    return 'png';
  }
  if (lower === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

export async function listLoans(status: LoanFilter = 'all'): Promise<Loan[]> {
  const data = await apiFetch<{ loans: Loan[] }>(
    `/loans?status=${encodeURIComponent(status)}`,
  );
  return data.loans;
}

export async function getLoan(id: string): Promise<Loan> {
  const data = await apiFetch<{ loan: Loan }>(`/loans/${id}`);
  return data.loan;
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const data = await apiFetch<{ loan: Loan }>('/loans', {
    method: 'POST',
    body: input,
  });
  return data.loan;
}

export async function repayLoan(id: string): Promise<Loan> {
  const data = await apiFetch<{ loan: Loan }>(`/loans/${id}/repay`, {
    method: 'POST',
  });
  return data.loan;
}

export async function uploadReceipt(
  loanId: string,
  file: ReceiptUploadFile,
): Promise<Loan> {
  const normalizedMime = normalizeImageMimeType(file.mimeType, file.uri);
  const ext = extensionForMime(normalizedMime);
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const rawBlob = await (await fetch(file.uri)).blob();
    const typedBlob = new Blob([rawBlob], { type: normalizedMime });
    formData.append('receipt', typedBlob, `receipt.${ext}`);
  } else {
    const rnFile: ReactNativeFormDataFile = {
      uri: file.uri,
      name: `receipt.${ext}`,
      type: normalizedMime,
    };
    // React Native's FormData implementation expects { uri, name, type } rather than a DOM Blob
    formData.append('receipt', rnFile as unknown as Blob);
  }

  const data = await apiFetch<{ loan: Loan }>(`/loans/${loanId}/receipt`, {
    method: 'POST',
    body: formData,
  });

  return data.loan;
}
