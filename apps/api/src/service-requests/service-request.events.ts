import type { ServiceRequestType } from '@law-firm/shared';

export const SERVICE_REQUEST_EVENTS = {
  created: 'service-request.created',
  accepted: 'service-request.accepted',
  rejected: 'service-request.rejected',
  assigned: 'service-request.assigned',
} as const;

export interface ServiceRequestRef {
  id: string;
  title: string;
  type: ServiceRequestType;
  requesterId: string;
  /** "С. Ганбат" */
  requesterName: string;
}

export interface ServiceRequestCreatedEvent {
  request: ServiceRequestRef;
}

export interface ServiceRequestReviewedEvent {
  request: ServiceRequestRef;
  actorId: string;
}

export interface ServiceRequestRejectedEvent extends ServiceRequestReviewedEvent {
  reason: string;
}

export interface ServiceRequestAssignedEvent extends ServiceRequestReviewedEvent {
  caseRef: { id: string; caseNumber: string; title: string };
  leadId: string;
  memberIds: string[];
}
