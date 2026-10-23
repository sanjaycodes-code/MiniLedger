import { Loan } from '@prisma/client';

export interface AuthUser {
  id: string;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
    interface Locals {
      loan?: Loan;
    }
  }
}
