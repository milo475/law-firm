export const INVOICE_PAYMENT_EVENTS = {
  marked: 'invoice.payment-marked',
  confirmed: 'invoice.payment-confirmed',
  rejected: 'invoice.payment-rejected',
} as const;

export interface InvoicePaymentRef {
  id: string;
  invoiceNumber: string;
  amount: string;
  caseId: string;
  caseNumber: string;
  clientId: string;
  lawyerId: string;
}

export interface InvoicePaymentMarkedEvent {
  invoice: InvoicePaymentRef;
  actorId: string;
  paymentNote: string | null;
}

export interface InvoicePaymentConfirmedEvent {
  invoice: InvoicePaymentRef;
  actorId: string;
}

export interface InvoicePaymentRejectedEvent {
  invoice: InvoicePaymentRef;
  actorId: string;
  reason: string;
}
