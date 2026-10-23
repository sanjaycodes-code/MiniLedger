export type LoanStatus = 'open' | 'repaid' | 'overdue';

export interface Loan {
  id: string;
  friendName: string;
  amountMinor: number;
  dueDate: string;
  status: LoanStatus;
  repaidAt: string | null;
  hasReceipt: boolean;
  createdAt: string;
}

export interface SummaryCounts {
  total: number;
  open: number;
  repaid: number;
  overdue: number;
}

export interface Summary {
  totalLentMinor: number;
  totalRepaidMinor: number;
  outstandingMinor: number;
  overdueMinor: number;
  counts: SummaryCounts;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface User {
  id: string;
  phone: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
