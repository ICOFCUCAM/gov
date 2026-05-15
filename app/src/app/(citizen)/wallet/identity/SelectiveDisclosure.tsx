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
  const [requested] = React.useState<string[]>(['name', 'over18', 'vaccination']);
  const [shared, setShared] = React.useState(false);

  const sharing = ALL.filter(a => requested.includes(a.key));
  const notSharing = ALL.filter(a => !requested.includes(a.key));

  function share() {
    appendAuditEntry('selective-disclosure', {
      to: 'Kiambu County Hospital',
      shared: requested,
      subject: subjectName,
    });
    setShared(true);
  }

  if (shared) {
    return (
      <Card tight>
        <h4 className="font-semibold">Shared</h4>
        <p className="text-sm">
          You shared {sharing.length} attributes with{' '}
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

      <h4 className="font-semibold mt-3 mb-1">You will share</h4>
      <ul className="space-y-1">
        {sharing.map(a => (
          <li key={a.key} className="flex justify-between text-sm">
            <span>{a.label}</span>
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
        <Button onClick={share}>Share now</Button>
        <Button variant="secondary">Cancel</Button>
      </div>
      <p className="text-sm text-ink-muted mt-2">You can revoke this later.</p>
    </Card>
  );
}
