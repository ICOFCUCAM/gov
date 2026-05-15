/** Canonical event topics. Subjects are hierarchical for NATS/Kafka routing. */
export const Topics = {
  PermitSubmitted: 'civicos.permit.submitted',
  PermitDecided: 'civicos.permit.decided',
  PaymentExecuted: 'civicos.payment.executed',
  DocumentSigned: 'civicos.document.signed',
  TenantProvisioned: 'civicos.tenant.provisioned',
} as const;

export type Topic = (typeof Topics)[keyof typeof Topics];

export interface DomainEvent<T = unknown> {
  topic: Topic;
  tenantId: string;
  partitionKey: string;
  payload: T;
  occurredAt: string;
}
