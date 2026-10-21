// The workflow foundation's records (docs/GOVERNMENT_OPERATING_MODEL.md §6,
// directions §5): procedures (case packages, versioned, approved by the
// responsible authority before use) and the cases that run under them. A
// status is never just a label: every step is an authorised action with its
// evidence, time and reason (directions 5.1).

import type { Citation } from '@/lib/law/register';
import type { AuthorityKey } from '@/lib/nation/deployment';
import type { Sensitivity } from '@/lib/auth/roles';

import type { ContractField, ContractDocument, FormFieldType, FormSpec, Channel } from '@/lib/forms/contract';

/**
 * A field's type. The first nine are the types every procedure used before
 * the form contract (lib/forms/contract.ts); the contract adds typed
 * references, approved lists, money, evidence, addresses and positions.
 */
export type FieldType = FormFieldType;

/**
 * A field of a procedure, which is also its form (lib/forms/contract.ts,
 * plan §3.1): type, personal-data class (`personal` kept, derived, for
 * packages before the contract), named validation rules, plain-language
 * label, hint and error text (translated through the review), who answers
 * it. Versioned with the procedure package.
 */
export interface FieldSpec extends ContractField {
  type: FieldType;
}

/** Evidence a procedure asks for, with the provision of law (and its version) that requires it. */
export type DocumentSpec = ContractDocument;

export type { FormSpec, Channel };

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
  /**
   * The number of days, as the nation's law sets it: set by the nation when it
   * approves its version of the procedure (a version cannot be approved with
   * it unset). Reference procedures ship without it.
   */
  days?: number;
  /** A demonstration value shipped with a reference procedure: used only by a demo or training installation, and then marked Sample. */
  sampleDays?: number;
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
  /** The form's own version, intro, declaration, evidence policy and translations (the form contract). Packages before it have none and work as before. */
  form?: FormSpec;
  stages: { key: string; label: string; terminal?: boolean }[];
  actions: ActionSpec[];
  deadlines: DeadlineSpec[];
  notifications: NotificationSpec[];
  /** The appeal: its days as the nation's law sets them (unset in a reference procedure; sampleDays only for demonstrations). */
  appeal?: { days?: number; sampleDays?: number; body: string; suspensive: boolean; citation?: Citation };
  /** Its day counts were filled from the reference's sample values in a demo or training installation (shown marked Sample; never approved in production). */
  sampleDeadlines?: true;
  retention: string;
  sensitivity: Sensitivity;
  migration?: { from: number; stageMap: Record<string, string> };
  state: 'draft' | 'approved' | 'superseded';
  activeFrom?: string;
  author: string;
  authorId?: string;
  /** Officials who changed this draft after it was written (its form, day counts, evidence); none of them may approve it. */
  editors?: { by: string; byId?: string; at: string; what: string }[];
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
  /** How independent the two officials of a two-official step are known to be (lib/data/dual-control.ts independenceOf). */
  independence?: 'identity-provider' | 'accounts-only' | 'unverified';
}

export interface Proposal {
  action: string;
  by: { id?: string; name: string; institution?: string };
  at: string;
  reason?: string;
  citations?: Citation[];
  fields?: Record<string, unknown>;
  idempotencyKey?: string;
  /** When it lapses unconfirmed (the dual-control policy's waiting period). */
  expiresAt?: string;
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
  /** `sample`: counted with a demonstration day count (a demo or training installation), shown marked Sample. */
  deadlines: { key: string; label: string; due: string; met?: string; lapsed?: string; citation?: Citation; sample?: true }[];
  /** Sealed decision ids (lib/records/decisions.ts). */
  decisions: string[];
  links: { kind: 'referral' | 'appeal' | 'related' | 'supersedes' | 'referred-from' | 'appeal-of'; case: string }[];
  sensitivity: Sensitivity;
  legalHold?: { by: string; at: string; reason: string };
  history: Step[];
  pending?: Proposal;
  /** Proposals that lapsed unconfirmed, kept as they were (a new proposal starts again). */
  lapsedProposals?: (Proposal & { lapsedAt: string })[];
  source: 'entered' | 'citizen' | 'imported' | 'feed' | 'exchange' | 'sample';
  version: number;
  openedAt: string;
  closedAt?: string;
  /** Set when the nation's retention rule removed the personal fields and names (lib/data/retention.ts). */
  anonymisedAt?: string;
  /** How the application arrived, under which form version (submitted forms only; spec Part 1 §11). */
  intake?: Intake;
  /** Answers checked with an exchange service: what the applicant entered stays distinct from what a register confirmed. */
  verifications?: Verification[];
  /** Where each answer came from: entered (by whom, on which channel, when) or verified against a register or exchange service (which, when). */
  fieldSources?: Record<string, FieldSource>;
}

/** Where an answer came from (spec Part 1 §11: a user-entered value is distinct from a verified one). */
export interface FieldSource { source: 'entered' | 'verified'; at: string; by?: string; channel?: Channel | 'step'; service?: string }

/** How an application arrived: its channel, the form, declaration and evidence-policy versions, and who assisted. */
export interface Intake {
  channel: Channel;
  at: string;
  form: { version: string; declaration?: string; evidencePolicy?: string };
  /** The applicant confirmed the declaration of this version (self-service and assisted; on paper, the signed form). */
  declaration?: { version: string; confirmedAt: string };
  locale?: string;
  /** Assisted at an office: the official who assisted, where, and the kind of identity evidence they saw (never its number). */
  assisted?: { by: { id?: string; name: string }; servicePoint?: string; identityEvidence: string };
  /** Transcribed from a paper form by this official. */
  paper?: { by: { id?: string; name: string }; receivedOn?: string };
}

/** The result of checking one answer with an exchange service (lib/exchange/services.ts). */
export interface Verification {
  field: string;
  service: string;
  result: 'verified' | 'not-matched' | 'unknown' | 'not-performed';
  /** Why it was not performed, in words (no provision of law in force allows it, the service did not answer). */
  note?: string;
  at: string;
  receipt?: string;
}
