/** Domain events emitted by DocumentRequestsService. Listeners turn them into notifications. */
export const DOCUMENT_REQUEST_EVENTS = {
  created: 'document-request.created',
  submitted: 'document-request.submitted',
  reviewed: 'document-request.reviewed',
} as const;

export interface DocumentRequestCaseRef {
  id: string;
  caseNumber: string;
  clientId: string;
  lawyerId: string;
}

export interface DocumentRequestRef {
  id: string;
  title: string;
}

export interface DocumentRequestCreatedEvent {
  caseRef: DocumentRequestCaseRef;
  actorId: string;
  requests: (DocumentRequestRef & { dueDate: Date | null })[];
}

export interface DocumentRequestSubmittedEvent {
  caseRef: DocumentRequestCaseRef;
  actorId: string;
  request: DocumentRequestRef;
  fileCount: number;
}

export interface DocumentRequestReviewedEvent {
  caseRef: DocumentRequestCaseRef;
  actorId: string;
  request: DocumentRequestRef;
  decision: 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
}
