'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextField, SelectField } from '@/components/ui/Field';
import { Plain } from '@/components/ui/Plain';
import { api } from '@/lib/api/client';
import type { PermitType } from '@/lib/api/types';

const TYPES: { value: PermitType; label: string }[] = [
  { value: 'business', label: 'Business permit' },
  { value: 'building', label: 'Building permit' },
  { value: 'market-stall', label: 'Market stall licence' },
  { value: 'event', label: 'Public event permit' },
  { value: 'food-handling', label: 'Food handling permit' },
  { value: 'vehicle', label: 'Vehicle permit' },
];

export function NewPermitForm() {
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
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Plain>
        Tell us what you need. You will get a receipt, a named officer, and a
        target decision date. You can track this any time and question any
        decision.
      </Plain>

      <div className="mt-4">
        <SelectField label="Permit type" name="type" required defaultValue="business">
          {TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </SelectField>

        <TextField
          label="What is this for?"
          name="title"
          required
          placeholder="e.g. Bakery — small business permit"
        />

        <TextField
          label="Applicant name"
          name="applicantName"
          required
          defaultValue="Amina Hassan Mwangi"
        />

        <TextField
          label="Municipality"
          name="municipality"
          required
          defaultValue="Kiambu"
        />

        <TextField
          label="Premises / location"
          name="premises"
          placeholder="e.g. Plot 4423"
        />

        <div className="mb-4">
          <label htmlFor="details" className="block font-medium mb-1">
            Anything we should know? (optional)
          </label>
          <textarea
            id="details"
            name="details"
            className="w-full min-h-[90px] p-3 border border-line rounded-sm bg-surface"
            placeholder="In plain language…"
          />
        </div>
      </div>

      {error ? (
        <p className="text-alert text-sm mb-3" role="alert">{error}</p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit application'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancel
        </Button>
      </div>
      <p className="text-sm text-ink-muted mt-2">
        Prefer not to use a phone? Dial *civic#, visit any office, or ask an
        agent. The same application works on every channel.
      </p>
    </form>
  );
}
