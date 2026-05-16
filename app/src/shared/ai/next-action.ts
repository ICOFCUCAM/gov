// AI orchestration — next-best-action recommendation.
//
// Given a work item's kind, stage, priority and age, recommend the next
// legitimate action and a rationale. Deterministic & explainable (no
// opaque generation): the recommendation is a function of the workflow
// state and SLA pressure, so it is reproducible and auditable. The UI
// offers it as a one-click execution (still RBAC/constitution gated).

import { actionsFor, type ActionKey, type WorkItem } from '@/lib/gov/runtime-workflow';

export interface NextAction {
  action: ActionKey | null;
  rationale: string;
  confidence: number; // 0-100
  urgent: boolean;
}

// Preference order when multiple actions are available, by posture.
const PROGRESS: ActionKey[] = ['advance', 'approve', 'resolve', 'assign'];
const RELIEF: ActionKey[] = ['escalate', 'return', 'reject'];

export function nextBestAction(item: WorkItem): NextAction {
  const options = actionsFor(item.kind, item.stage);
  if (options.length === 0 || item.closed) {
    return { action: null, rationale: 'Terminal state — no action required.', confidence: 100, urgent: false };
  }
  const breaching = item.ageHrs > 120;
  const urgent = item.priority === 'urgent' || breaching;

  // Under SLA/urgency pressure, prefer escalation if available, else
  // progress the item; otherwise progress, else first available.
  let pick: ActionKey | undefined;
  if (urgent && options.includes('escalate')) pick = 'escalate';
  if (!pick) pick = PROGRESS.find(a => options.includes(a));
  if (!pick) pick = RELIEF.find(a => options.includes(a));
  if (!pick) pick = options[0];

  const reasonBits: string[] = [];
  if (breaching) reasonBits.push(`SLA breached (${item.ageHrs}h)`);
  if (item.priority !== 'routine') reasonBits.push(`${item.priority} priority`);
  reasonBits.push(`at '${item.stage}'`);
  const confidence = Math.max(45, Math.min(96,
    72 + (urgent ? 12 : 0) + (PROGRESS.includes(pick!) ? 8 : -4) - (options.length - 1) * 3));

  return {
    action: pick!,
    rationale: `Recommend ${pick} — ${reasonBits.join(' · ')}.`,
    confidence,
    urgent,
  };
}
