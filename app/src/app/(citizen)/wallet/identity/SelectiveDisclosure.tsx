'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { appendAuditEntry } from '@/lib/audit/localVault';

interface Attr {
  key: string;
  label: string;
  value: string;
}

const ALL: Attr[] = [
  { key: 'name', label: 'Full name', value: 'Amina Hassan Mwangi' },
  { key: 'over18', label: 'Over 18', value: 'Yes' },
  { key: 'dob', label: 'Date of birth', value: '14.03.1992' },
  { key: 'address', label: 'Address', value: 'Plot 4423, Kiambu' },
  { key: 'nationalId', label: 'National ID number', value: '••••••••' },
  { key: 'vaccination', label: 'Pneumococcal vaccination', value: '12/2024' },
];

export function SelectiveDisclosure({ subjectName }: { subjectName: string }) {
  const requested = React.useMemo(() => ['name', 'over18', 'vaccination'], []);
  const [granted, setGranted] = React.useState<string[]>(requested);
  const [shared, setShared] = React.useState(false);
  const [declined, setDeclined] = React.useState(false);

  const sharing = ALL.filter(a => requested.includes(a.key));
  const notSharing = ALL.filter(a => !requested.includes(a.key));
  const toggle = (k: string) => setGranted(g => (g.includes(k) ? g.filter(x => x !== k) : [...g, k]));

  function share() {
    appendAuditEntry('selective-disclosure', {
      to: 'Kiambu County Hospital',
      shared: granted,
      subject: subjectName,
    });
    setShared(true);
  }

  if (declined) {
    return (
      <Card tight>
        <h4 className="font-semibold">Nothing shared</h4>
        <p className="text-sm">
          You declined the request from <strong>Kiambu County Hospital</strong>.
          No attributes were disclosed; the decline is noted in your access log.
        </p>
        <Button className="mt-3" variant="secondary" onClick={() => setDeclined(false)}>
          Back
        </Button>
      </Card>
    );
  }

  if (shared) {
    return (
      <Card tight>
        <h4 className="font-semibold">Shared</h4>
        <p className="text-sm">
          You shared {granted.length} of {sharing.length} requested attributes with{' '}
          <strong>Kiambu County Hospital</strong> for this visit only. This is
          now in your records access log. You can revoke it later.
        </p>
        <Button className="mt-3" variant="secondary" onClick={() => setShared(false)}>
          Done
        </Button>
      </Card>
    );
  }

  return (
    <Card tight>
      <p className="text-sm">
        <strong>Kiambu County Hospital</strong> is asking to verify the
        following, for the purpose of <em>scheduling a vaccination
        follow-up</em>, for <em>this visit only</em>:
      </p>

      <h4 className="font-semibold mt-3 mb-1">Choose what to share</h4>
      <ul className="space-y-1">
        {sharing.map(a => (
          <li key={a.key} className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={granted.includes(a.key)} onChange={() => toggle(a.key)} />
              <span>{a.label}</span>
            </label>
            <span className="text-ink-muted">{a.value}</span>
          </li>
        ))}
      </ul>

      <h4 className="font-semibold mt-3 mb-1">Not shared</h4>
      <div className="flex flex-wrap gap-1">
        {notSharing.map(a => (
          <Pill key={a.key}>{a.label}</Pill>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={share} disabled={granted.length === 0}>
          {granted.length ? `Share ${granted.length} now` : 'Select at least one'}
        </Button>
        <Button variant="secondary" onClick={() => setDeclined(true)}>Cancel</Button>
      </div>
      <p className="text-sm text-ink-muted mt-2">You can revoke this later.</p>
    </Card>
  );
}
