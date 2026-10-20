// The workflow foundation's records (docs/GOVERNMENT_OPERATING_MODEL.md §6,
// directions §5): procedures (case packages, versioned, approved by the
// responsible authority before use) and the cases that run under them. A
// status is never just a label: every step is an authorised action with its
// evidence, time and reason (directions 5.1).

import type { Citation } from '@/lib/law/register';
import type { AuthorityKey } from '@/lib/nation/deployment';
import type { Sensitivity } from '@/lib/auth/roles';

export type FieldType = 'text' | 'longtext' | 'date' | 'number' | 'choice' | 'boolean' | 'person' | 'organisation' | 'place';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** For choice. */
  options?: string[];
  /** Personal data: shown only to those who may read the case, never in lists or events. */
  personal?: boolean;
  max?: number;
}

export interface DocumentSpec { class: string; label: string; required: boolean; citation?: Citation }

export interface ActionSpec {
  key: string;
  label: string;
  from: string[];
  to: string;
  /** Makes the action a legal decision of this kind (register, grant, refuse, revoke…): sealed, citing the law. */
  decision?: string;
  needs: { role: 'officer' | 'signatory'; assigned?: boolean; fourEyes?: boolean; stepUp?: boolean };
  requires?: { documents?: string[]; fields?: string[]; reasons?: boolean; citations?: boolean };
  /** Domain effects the owning module registered (lib/casework/engine.ts registerEffect()). */
  effects?: string[];
}

export interface DeadlineSpec {
  key: string;
  label: string;
  /** Counted from the case reaching this stage ('opened' for opening). */
  from: string;
  days: number;
  calendar: 'calendar' | 'working';
  citation?: Citation;
  onLapse: 'escalate' | 'notify' | 'deemed-refusal' | 'deemed-approval';
  /** The deadline is met when the case leaves `from` for any other stage. */
}

export interface NotificationSpec { on: string; to: 'applicant' | 'assignee' | 'owner'; template: string }

export interface CasePackage {
  key: string;
  version: number;
  /** The authority (resolved through the deployment profile) or an institution id. */
  owner: AuthorityKey | string;
  title: string;
  refPrefix: string;
  citations: Citation[];
  /**
   * The permit type whose approved authority mapping governs this procedure's
   * decisions, for a procedure the platform does not already classify
   * (lib/permits/decisions.ts). Approved with the procedure by two officials.
   */
  authority?: { permitType: string };
  fields: FieldSpec[];
  documents: DocumentSpec[];
  stages: { key: string; label: string; terminal?: boolean }[];
  actions: ActionSpec[];
  deadlines: DeadlineSpec[];
  notifications: NotificationSpec[];
  appeal?: { days: number; body: string; suspensive: boolean; citation?: Citation };
  retention: string;
  sensitivity: Sensitivity;
  migration?: { from: number; stageMap: Record<string, string> };
  state: 'draft' | 'approved' | 'superseded';
  activeFrom?: string;
  author: string;
  authorId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  /** Shipped with CivicOS as a reference; arrives as a draft the nation must approve. */
  reference?: boolean;
  tests: PackageTest[];
}

export interface PackageTest { name: string; steps: { action: string; fields?: Record<string, unknown>; documents?: string[]; expect: string }[] }

export interface Party { kind: 'person' | 'organisation' | 'institution' | 'unregistered'; id?: string; name: string }

export interface Step {
  seq: number;
  action: string;
  from: string;
  to: string;
  by: { id?: string; name: string; institution?: string };
  confirmedBy?: { id?: string; name: string };
  at: string;
  reason?: string;
  evidence?: string[];
  citations?: Citation[];
  decision?: string;
  idempotencyKey?: string;
  /** The confirming official's own key on a four-eyes step, so a repeated confirmation is recognised too. */
  confirmIdempotencyKey?: string;
}

export interface Proposal {
  action: string;
  by: { id?: string; name: string; institution?: string };
  at: string;
  reason?: string;
  citations?: Citation[];
  fields?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface Case {
  id: string;
  ref: string;
  package: { key: string; version: number };
  owner: string;
  stage: string;
  subject: Party[];
  applicant?: Party;
  onBehalfOf?: Party;
  delegation?: string;
  fields: Record<string, unknown>;
  documents: string[];
  assignee?: { id: string; name: string };
  priority: 'routine' | 'priority' | 'urgent';
  deadlines: { key: string; label: string; due: string; met?: string; lapsed?: string; citation?: Citation }[];
  /** Sealed decision ids (lib/records/decisions.ts). */
  decisions: string[];
  links: { kind: 'referral' | 'appeal' | 'related' | 'supersedes' | 'referred-from' | 'appeal-of'; case: string }[];
  sensitivity: Sensitivity;
  legalHold?: { by: string; at: string; reason: string };
  history: Step[];
  pending?: Proposal;
  source: 'entered' | 'citizen' | 'imported' | 'feed' | 'exchange' | 'sample';
  version: number;
  openedAt: string;
  closedAt?: string;
  /** Set when the nation's retention rule removed the personal fields and names (lib/data/retention.ts). */
  anonymisedAt?: string;
}
