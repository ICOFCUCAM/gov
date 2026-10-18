'use client';

// The signed-in official's recent sign-in activity (My account), from the
// audit chain (/api/auth/activity): sign-ins with a coarse device, failed
// attempts against the account, password and second-step changes, and what
// administrators changed. Failures since the previous sign-in are called out,
// with the way to end every other session (change the password).

import * as React from 'react';
import { useSignIn } from '@/lib/official';

interface Entry { at: string; what: string; ok: boolean; by?: string; detail?: string }
const when = (iso: string) => new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function SignInActivity() {
  const official = useSignIn()?.official ?? null;
  const [data, setData] = React.useState<{ entries: Entry[]; failedSincePreviousSignIn: number } | null>(null);
  React.useEffect(() => {
    if (!official) return;
    void fetch('/api/auth/activity', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(setData);
  }, [official]);
  if (!official || !data) return null;
  const n = data.failedSincePreviousSignIn;
  return (
    <section id="activity" className="mx-auto mb-4 max-w-[1100px] space-y-3 rounded-[3px] border border-line bg-surface p-4 text-[14px] text-ink">
      <h2 className="text-[17px] font-semibold">Recent sign-in activity</h2>
      {n > 0 ? (
        <p role="alert" className="rounded-[3px] border border-warn p-2 text-[13px]">
          {n} failed attempt{n === 1 ? '' : 's'} to sign in to your account since your previous sign-in.
          {official.method === 'local' ? <> If that was not you, <a href="#password" className="text-link underline">change your password</a> (it signs you out everywhere else) and turn on the <a href="#two-step" className="text-link underline">second sign-in step</a>.</> : null}
        </p>
      ) : null}
      {data.entries.length === 0 ? <p className="text-ink-soft">Nothing recorded yet.</p> : (
        <table className="w-full text-[13px]">
          <thead><tr className="border-b border-line text-ink-muted"><th className="py-1 text-start font-semibold">When</th><th className="text-start font-semibold">What</th><th className="text-start font-semibold">Details</th></tr></thead>
          <tbody>
            {data.entries.map((e, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td className="py-1.5 tabular-nums">{when(e.at)}</td>
                <td className={e.ok ? '' : 'text-alert'}>{e.what}</td>
                <td className="text-ink-soft">{[e.detail, e.by ? `by ${e.by}` : ''].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[12px] text-ink-muted">From the audit record. Devices are recorded only as browser and system; no addresses are kept.</p>
    </section>
  );
}
