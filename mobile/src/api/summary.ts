import { apiFetch } from './client';
import { Summary } from './types';

export async function getSummary(): Promise<Summary> {
  return apiFetch<Summary>('/summary');
}
