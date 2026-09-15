'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type BankAccountSettings, type InvoiceItem, type InvoicePaymentSummary } from './api';

export const BANK_ACCOUNT_KEY = ['settings', 'bank-account'] as const;
export const INVOICE_PAYMENT_SUMMARY_KEY = ['invoices', 'payment-summary'] as const;

/** Invoices the client still has to pay and can report as paid. */
export const isPayable = (invoice: Pick<InvoiceItem, 'status'>) => invoice.status === 'SENT' || invoice.status === 'OVERDUE';

/** The client reported a transfer and staff have not confirmed it yet. */
export const isAwaitingConfirmation = (invoice: Pick<InvoiceItem, 'status'>) => invoice.status === 'AWAITING_CONFIRMATION';

/** Transfer account shown in the payment instructions (served by the API, so it changes in one place). */
export function useBankAccount(enabled = true) {
  return useQuery({
    queryKey: BANK_ACCOUNT_KEY,
    queryFn: () => api.get<BankAccountSettings>('/settings/bank-account'),
    enabled,
    staleTime: Infinity,
  });
}

/** Reported payments waiting for confirmation within the viewer's scope (admin sidebar badge). */
export function useInvoicePaymentSummary(enabled = true) {
  return useQuery({
    queryKey: INVOICE_PAYMENT_SUMMARY_KEY,
    queryFn: () => api.get<InvoicePaymentSummary>('/invoices/payment-summary'),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** "5023118822" → "5023 1188 22" */
export function formatAccountNumber(value: string): string {
  return value.replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}
