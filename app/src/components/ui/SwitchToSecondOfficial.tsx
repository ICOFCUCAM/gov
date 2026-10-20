'use client';

// "Switch to a different official to confirm": placed next to anything that
// waits for a second official (a case proposal, a four-eyes step). On a
// demonstration or training installation it offers the demo cast's other
// signatory of the institution concerned (lib/auth/demo-cast.ts); switching
// issues that account's session (/api/demo/act-as, audited) and reloads, and
// the confirm control is then theirs to press. The cast are separate
// accounts, so four-eyes stays real. Renders nothing on a production
// installation, when nobody may switch, or when the cast has no one suitable.

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { useDemoCast, switchTo } from '@/components/ui/DemoCast';
import type { OfficialRole } from '@/lib/auth/roles';

export function SwitchToSecondOfficial({ institution, proposedBy, role = 'signatory', label }: {
  /** The institution whose official confirms (a ministry id); omit for a whole-government step. */
  institution?: string;
  /** The session subject of who proposed (local:<id>), so they are never offered. */
  proposedBy?: string;
  /** The role the confirmation needs: an official who can sign, by default. */
  role?: OfficialRole;
  /** Override the button wording. */
  label?: (name: string) => string;
}) {
  const cast = useDemoCast();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  if (!cast?.canSwitch) return null;
  const group = cast.groups.find(g => g.institution === (institution ?? ''));
  const pick = group?.members.find(m => m.role === role && `local:${m.id}` !== proposedBy && `local:${m.id}` !== cast.viewer?.sub);
  if (!pick) return null;
  const go = async () => {
    setBusy(true); setMsg(null);
    const err = await switchTo(pick.id);
    if (err) { setMsg(err); setBusy(false); }
  };
  return (
    <span className="inline-flex flex-col gap-1" data-switch-second-official>
      <Button variant="secondary" disabled={busy} onClick={() => void go()}>
        {label ? label(pick.name) : `Switch to ${pick.name} to confirm`}
      </Button>
      {msg ? <span role="status" className="text-xs text-alert">{msg}</span> : null}
    </span>
  );
}
