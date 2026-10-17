'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/Field';
import { Plain } from '@/components/ui/Plain';
import { api } from '@/lib/api/client';
import type { PermitType } from '@/lib/api/types';
import { DEMO_CITIZEN, homePlace } from '@/lib/nation/persona';
import { nationMessages } from '@/lib/nation/registry';
import type { Messages } from '@/lib/i18n';
// Labels in the nation's language; the values sent to the API are unchanged.
const typesFor = (x: Messages['pages']): { value: PermitType; label: string }[] => [
  { value: 'business', label: x.business },
  { value: 'building', label: x.building },
  { value: 'market-stall', label: x.marketStall },
  { value: 'event', label: x.event },
  { value: 'food-handling', label: x.foodHandling },
  { value: 'vehicle', label: x.vehicle },
];

export function NewPermitForm() {
  const m = nationMessages();
  const x = m.pages;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const { permit } = await api.permits.create({
        type: f.get('type') as PermitType,
        title: String(f.get('title')),
        applicantName: String(f.get('applicantName')),
        municipality: String(f.get('municipality')),
        fields: {
          premises: String(f.get('premises') ?? ''),
          details: String(f.get('details') ?? ''),
        },
      });
      router.push(`/wallet/permits/${permit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : x.somethingWrong);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Plain>
        {x.newIntro}
      </Plain>

      <div className="mt-4">
        <SelectField label={x.permitType} name="type" required defaultValue="business">
          {typesFor(x).map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </SelectField>

        <TextField
          label={x.whatFor}
          name="title"
          required
          placeholder={x.whatForHint}
        />

        <TextField
          label={x.applicantName}
          name="applicantName"
          required
          defaultValue={DEMO_CITIZEN.name}
        />

        <TextField
          label={x.municipalityLabel}
          name="municipality"
          required
          defaultValue={homePlace()}
        />

        <TextField
          label={x.premises}
          name="premises"
          placeholder={x.premisesHint}
        />

        <div className="mb-4">
          <label htmlFor="details" className="block font-medium mb-1">
            {x.anythingKnow}
          </label>
          <textarea
            id="details"
            name="details"
            className="w-full min-h-[90px] p-3 border border-line rounded-sm bg-surface"
            placeholder={x.plainLanguage}
          />
        </div>
      </div>

      {error ? (
        <p className="text-alert text-sm mb-3" role="alert">{error}</p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? x.submitting : x.submitApplication}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          {m.common.cancel}
        </Button>
      </div>
      <p className="text-sm text-ink-muted mt-2">
        {x.otherChannels}
      </p>
    </form>
  );
}
