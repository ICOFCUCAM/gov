// The receipt an applicant gets when a form is received (spec Part 1 §11:
// explicit confirmation that the request was received; the assisted channel
// gives the applicant a receipt). It names the reference, when it was
// received, the procedure and form versions, the channel and who assisted,
// and nothing the applicant wrote: it can be shown, printed or sent safely.

import { getPackage } from '@/lib/casework/packages';
import type { Case } from '@/lib/casework/types';

export interface Receipt {
  ref: string;
  receivedAt: string;
  procedure: string;
  procedureVersion: number;
  form?: string;
  declaration?: string;
  evidencePolicy?: string;
  channel?: string;
  assistedBy?: string;
  servicePoint?: string;
  /** Evidence still to provide, by label (what the applicant said they will bring or send). */
  stillToProvide: string[];
}

export function receiptOf(c: Case): Receipt {
  const pkg = getPackage(c.package.key, c.package.version);
  const later = (pkg?.fields ?? []).filter(f => f.type === 'document' && [c.fields[f.key]].flat().some(v => v === 'later' || v === 'alternative')).map(f => f.label);
  return {
    ref: c.ref, receivedAt: c.openedAt, procedure: pkg?.title ?? c.package.key, procedureVersion: c.package.version,
    ...(c.intake ? { form: c.intake.form.version, ...(c.intake.form.declaration ? { declaration: c.intake.form.declaration } : {}), ...(c.intake.form.evidencePolicy ? { evidencePolicy: c.intake.form.evidencePolicy } : {}), channel: c.intake.channel } : {}),
    ...(c.intake?.assisted ? { assistedBy: c.intake.assisted.by.name, ...(c.intake.assisted.servicePoint ? { servicePoint: c.intake.assisted.servicePoint } : {}) } : {}),
    stillToProvide: later,
  };
}
