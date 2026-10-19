'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { appendAuditEntry } from '@/lib/audit/localVault';
import { DEMO_CITIZEN, homePlace } from '@/lib/nation/persona';
import { nationMessages } from '@/lib/nation/registry';
import { t as fill, type Messages } from '@/lib/i18n';
import { rich } from '@/lib/i18n/rich';
interface Attr {
  key: string;
  label: string;
  value: string;
}

const attrsFor = (home: string, t: Messages['more']): Attr[] => [
  { key: 'name', label: t.fullName, value: DEMO_CITIZEN.name },
  { key: 'over18', label: t.over18, value: t.yes },
  { key: 'dob', label: t.dob, value: '14.03.1992' },
  { key: 'address', label: t.address, value: `Plot 4423, ${home}` },
  { key: 'nationalId', label: t.nationalId, value: '••••••••' },
  { key: 'vaccination', label: t.vaccination, value: '12/2024' },
];

export function SelectiveDisclosure({ subjectName }: { subjectName: string }) {
  const home = homePlace();
  const m = nationMessages();
  const t = m.more;
  const ALL = attrsFor(home, t);
  const requester = `${home} Hospital`;
  const requested = React.useMemo(() => ['name', 'over18', 'vaccination'], []);
  const [granted, setGranted] = React.useState<string[]>(requested);
  const [shared, setShared] = React.useState(false);
  const [declined, setDeclined] = React.useState(false);

  const sharing = ALL.filter(a => requested.includes(a.key));
  const notSharing = ALL.filter(a => !requested.includes(a.key));
  const toggle = (k: string) => setGranted(g => (g.includes(k) ? g.filter(x => x !== k) : [...g, k]));

  function share() {
    appendAuditEntry('selective-disclosure', {
      to: requester,
      shared: granted,
      subject: subjectName,
    });
    setShared(true);
  }

  if (declined) {
    return (
      <Card tight>
        <h4 className="font-semibold">{t.nothingShared}</h4>
        <p className="text-sm">
          {rich(t.declinedText, { who: <strong>{requester}</strong> })}
        </p>
        <Button className="mt-3" variant="secondary" onClick={() => setDeclined(false)}>
          {m.common.back}
        </Button>
      </Card>
    );
  }

  if (shared) {
    return (
      <Card tight>
        <h4 className="font-semibold">{t.sharedTitle}</h4>
        <p className="text-sm">
          {rich(t.sharedText, { n: granted.length, total: sharing.length, who: <strong>{requester}</strong> })}
        </p>
        <Button className="mt-3" variant="secondary" onClick={() => setShared(false)}>
          {t.done}
        </Button>
      </Card>
    );
  }

  return (
    <Card tight>
      <p className="text-sm">
        {rich(t.askingText, { who: <strong>{requester}</strong>, purpose: <em>{t.purpose}</em>, scope: <em>{t.scope}</em> })}
      </p>

      <h4 className="font-semibold mt-3 mb-1">{t.chooseShare}</h4>
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

      <h4 className="font-semibold mt-3 mb-1">{t.notShared}</h4>
      <div className="flex flex-wrap gap-1">
        {notSharing.map(a => (
          <Pill key={a.key}>{a.label}</Pill>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <Button onClick={share} disabled={granted.length === 0}>
          {granted.length ? fill(t.shareN, { n: granted.length }) : t.selectOne}
        </Button>
        <Button variant="secondary" onClick={() => setDeclined(true)}>{m.common.cancel}</Button>
      </div>
      <p className="text-sm text-ink-muted mt-2">{t.revokeLater}</p>
    </Card>
  );
}
