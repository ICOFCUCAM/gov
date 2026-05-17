// Operational Runtime — work-item state machines.
//
// This is the substrate that turns surfaces into an operating system: a
// generic, deterministic work-item engine with real procedural state
// transitions. Items are seeded deterministically (so views are stable),
// but transitions are pure functions the UI applies as transactional
// actions — approvals, escalations, advancement, resolution — each
// recorded in an audit trail. No React/DOM here.

import { seed } from '@/lib/telemetry';

export type WorkKind =
  | 'approval' | 'case' | 'procurement' | 'encounter'
  | 'bill' | 'judicial' | 'incident' | 'permit' | 'field' | 'lab';

export type ActionKey = 'advance' | 'approve' | 'reject' | 'escalate' | 'assign' | 'resolve' | 'return';

export interface WorkflowDef {
  kind: WorkKind;
  label: string;
  stages: string[];
  terminal: string[];           // stages with no outgoing transitions
  /** stage -> action -> next stage */
  transitions: Record<string, Partial<Record<ActionKey, string>>>;
}

export interface WorkEvent { at: number; from: string; to: string; action: ActionKey; by: string }
export interface WorkItem {
  id: string;
  title: string;
  kind: WorkKind;
  stage: string;
  priority: 'routine' | 'priority' | 'urgent';
  assignee: string;
  ageHrs: number;
  meta: Record<string, string>;
  history: WorkEvent[];
  closed: boolean;
}

const lin = (stages: string[], extra: Record<string, Partial<Record<ActionKey, string>>> = {}): Record<string, Partial<Record<ActionKey, string>>> => {
  const tr: Record<string, Partial<Record<ActionKey, string>>> = {};
  for (let i = 0; i < stages.length - 1; i++) {
    tr[stages[i]!] = { advance: stages[i + 1]!, escalate: stages[Math.min(stages.length - 1, i + 1)]!, ...(extra[stages[i]!] ?? {}) };
  }
  tr[stages.at(-1)!] = { ...(extra[stages.at(-1)!] ?? {}) };
  return tr;
};

export const WORKFLOWS: Record<WorkKind, WorkflowDef> = {
  approval: {
    kind: 'approval', label: 'Approval', stages: ['Submitted', 'Triaged', 'Under review', 'Decision', 'Closed', 'Rejected'],
    terminal: ['Closed', 'Rejected'],
    transitions: {
      Submitted: { advance: 'Triaged', assign: 'Triaged' },
      Triaged: { advance: 'Under review', escalate: 'Decision' },
      'Under review': { approve: 'Decision', reject: 'Rejected', return: 'Triaged' },
      Decision: { resolve: 'Closed' },
      Closed: {}, Rejected: {},
    },
  },
  permit: {
    kind: 'permit', label: 'Permit / licence', stages: ['Filed', 'Verification', 'Inspection', 'Adjudication', 'Issued', 'Refused'],
    terminal: ['Issued', 'Refused'],
    transitions: {
      Filed: { advance: 'Verification', assign: 'Verification' },
      Verification: { advance: 'Inspection', return: 'Filed' },
      Inspection: { advance: 'Adjudication', escalate: 'Adjudication' },
      Adjudication: { approve: 'Issued', reject: 'Refused' },
      Issued: {}, Refused: {},
    },
  },
  procurement: {
    kind: 'procurement', label: 'Procurement', stages: ['Solicitation', 'Evaluation', 'Award', 'Contracting', 'Disbursed', 'Cancelled'],
    terminal: ['Disbursed', 'Cancelled'],
    transitions: {
      Solicitation: { advance: 'Evaluation' },
      Evaluation: { advance: 'Award', reject: 'Cancelled' },
      Award: { advance: 'Contracting', escalate: 'Contracting' },
      Contracting: { resolve: 'Disbursed', return: 'Award' },
      Disbursed: {}, Cancelled: {},
    },
  },
  encounter: {
    kind: 'encounter', label: 'Clinical encounter', stages: ['Intake', 'Triage', 'Diagnosis', 'Treatment', 'Disposition', 'Referred'],
    terminal: ['Disposition', 'Referred'],
    transitions: {
      Intake: { advance: 'Triage', assign: 'Triage' },
      Triage: { advance: 'Diagnosis', escalate: 'Treatment' },
      Diagnosis: { advance: 'Treatment', escalate: 'Referred' },
      Treatment: { resolve: 'Disposition', escalate: 'Referred' },
      Disposition: {}, Referred: {},
    },
  },
  bill: {
    kind: 'bill', label: 'Bill', stages: ['Drafting', 'Committee', 'Debate', 'Amendment', 'Division', 'Assent', 'Enacted', 'Withdrawn'],
    terminal: ['Enacted', 'Withdrawn'],
    transitions: {
      Drafting: { advance: 'Committee', reject: 'Withdrawn' },
      Committee: { advance: 'Debate', return: 'Drafting' },
      Debate: { advance: 'Amendment' },
      Amendment: { advance: 'Division', return: 'Debate' },
      Division: { approve: 'Assent', reject: 'Withdrawn' },
      Assent: { resolve: 'Enacted' },
      Enacted: {}, Withdrawn: {},
    },
  },
  judicial: {
    kind: 'judicial', label: 'Case', stages: ['Filed', 'Pre-trial', 'Hearing', 'Judgment', 'Appeal', 'Closed', 'Dismissed'],
    terminal: ['Closed', 'Dismissed'],
    transitions: {
      Filed: { advance: 'Pre-trial', reject: 'Dismissed' },
      'Pre-trial': { advance: 'Hearing', assign: 'Hearing' },
      Hearing: { advance: 'Judgment' },
      Judgment: { resolve: 'Closed', escalate: 'Appeal' },
      Appeal: { resolve: 'Closed', reject: 'Dismissed' },
      Closed: {}, Dismissed: {},
    },
  },
  case: {
    kind: 'case', label: 'Case', stages: ['Open', 'Assigned', 'In progress', 'Review', 'Resolved', 'Closed'],
    terminal: ['Closed'],
    transitions: {
      Open: { assign: 'Assigned', advance: 'Assigned' },
      Assigned: { advance: 'In progress' },
      'In progress': { advance: 'Review', escalate: 'Review' },
      Review: { resolve: 'Resolved', return: 'In progress' },
      Resolved: { resolve: 'Closed' }, Closed: {},
    },
  },
  incident: {
    kind: 'incident', label: 'Incident', stages: ['Reported', 'Acknowledged', 'Containment', 'Recovery', 'Closed'],
    terminal: ['Closed'],
    transitions: {
      Reported: { advance: 'Acknowledged', assign: 'Acknowledged' },
      Acknowledged: { advance: 'Containment', escalate: 'Containment' },
      Containment: { advance: 'Recovery' },
      Recovery: { resolve: 'Closed', return: 'Containment' },
      Closed: {},
    },
  },
  field: {
    kind: 'field', label: 'Field deployment', stages: ['Staged', 'Tasked', 'En route', 'On scene', 'Cleared', 'Recalled'],
    terminal: ['Cleared', 'Recalled'],
    transitions: {
      Staged: { assign: 'Tasked', advance: 'Tasked' },
      Tasked: { advance: 'En route', return: 'Staged' },
      'En route': { advance: 'On scene', escalate: 'On scene', return: 'Tasked' },
      'On scene': { resolve: 'Cleared', escalate: 'On scene', reject: 'Recalled' },
      Cleared: {}, Recalled: {},
    },
  },
  lab: {
    kind: 'lab', label: 'Diagnostic specimen', stages: ['Received', 'Accessioned', 'In assay', 'Verified', 'Reported', 'Rejected'],
    terminal: ['Reported', 'Rejected'],
    transitions: {
      Received: { assign: 'Accessioned', advance: 'Accessioned', reject: 'Rejected' },
      Accessioned: { advance: 'In assay', return: 'Received' },
      'In assay': { advance: 'Verified', escalate: 'Verified', reject: 'Rejected', return: 'Accessioned' },
      Verified: { resolve: 'Reported', return: 'In assay' },
      Reported: {}, Rejected: {},
    },
  },
};

export function workflowFor(kind: WorkKind): WorkflowDef {
  return WORKFLOWS[kind];
}

export function actionsFor(kind: WorkKind, stage: string): ActionKey[] {
  return Object.keys(WORKFLOWS[kind].transitions[stage] ?? {}) as ActionKey[];
}

export function isTerminal(kind: WorkKind, stage: string): boolean {
  return WORKFLOWS[kind].terminal.includes(stage) || actionsFor(kind, stage).length === 0;
}

const ASSIGNEES = ['K. Otieno', 'L. Mensah', 'S. Patel', 'R. Diallo', 'M. Hassan', 'J. Kamau', 'F. Abebe', 'N. Farah'];

/** Deterministic initial work set for a scope (stable across renders). */
export function seedWorkItems(scope: string, kind: WorkKind, t: number, n = 12): WorkItem[] {
  const wf = WORKFLOWS[kind];
  const open = wf.stages.filter(s => !wf.terminal.includes(s));
  return Array.from({ length: n }, (_, i) => {
    const stage = open[Math.floor(seed(`wi:st:${scope}:${kind}:${i}`) * open.length)]!;
    const pr = seed(`wi:pr:${scope}:${kind}:${i}`);
    return {
      id: `${kind.slice(0, 2).toUpperCase()}-${1000 + i + (Math.floor(t / 30) % 7)}`,
      title: `${wf.label} ${1000 + i}`,
      kind,
      stage,
      priority: pr > 0.82 ? 'urgent' : pr > 0.52 ? 'priority' : 'routine',
      assignee: ASSIGNEES[i % ASSIGNEES.length]!,
      ageHrs: 1 + Math.round(seed(`wi:ag:${scope}:${kind}:${i}`) * 220),
      meta: {},
      history: [],
      closed: wf.terminal.includes(stage),
    };
  });
}

/** Pure transition. Returns a new item; invalid actions are a no-op. */
export function applyAction(item: WorkItem, action: ActionKey, by: string, at: number): WorkItem {
  const wf = WORKFLOWS[item.kind];
  const next = wf.transitions[item.stage]?.[action];
  if (!next || next === item.stage) return item;
  return {
    ...item,
    stage: next,
    closed: wf.terminal.includes(next),
    history: [...item.history, { at, from: item.stage, to: next, action, by }],
  };
}

export function queueStats(items: WorkItem[]) {
  return {
    total: items.length,
    open: items.filter(i => !i.closed).length,
    urgent: items.filter(i => i.priority === 'urgent' && !i.closed).length,
    breaching: items.filter(i => !i.closed && i.ageHrs > 120).length,
    closed: items.filter(i => i.closed).length,
  };
}
