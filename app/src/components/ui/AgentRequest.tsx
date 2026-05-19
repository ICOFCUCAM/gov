'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { post as encPost } from '@/lib/gov/encounter-store';

// Reusable citizen "talk to an agent" action — an inline disclosure that
// captures the request and returns a tracked reference, so the button is
// a real channel to the state rather than a dead control.
export function AgentRequest({ subjectId, label = 'Talk to an agent', prefix = 'AGT' }: {
  subjectId: string; label?: string; prefix?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [ref, setRef] = React.useState<string | null>(null);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const n = Math.abs([...`${prefix}:${subjectId}:${body}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 1e6;
    const id = `${prefix}-${String(n).padStart(6, '0')}`;
    // Persist into the live encounter system so the request is a real,
    // official-visible thread — not just a local acknowledgement.
    encPost('enc:support:desk', { author: 'PUBLIC', name: 'Citizen', kind: 'question', body: `[${id}·${subjectId}] ${body}` }, Date.now());
    setRef(id);
    setText('');
  };

  return (
    <div>
      <Button variant="secondary" onClick={() => { setOpen(o => !o); setRef(null); }}>{label}</Button>
      {open ? (
        <div className="mt-2 rounded-[8px] border border-line p-3">
          <label htmlFor={`agent-${subjectId}`} className="mb-1 block text-sm font-medium text-ink">
            What do you need help with?
          </label>
          <textarea
            id={`agent-${subjectId}`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            className="focus-ring w-full rounded-[6px] border border-line bg-surface p-2 text-sm text-ink"
            placeholder="Describe your question — a case officer will respond."
          />
          <div className="mt-2 flex items-center gap-3">
            <Button variant="primary" disabled={!text.trim()} onClick={submit}>Request callback</Button>
            {ref ? (
              <span className="text-sm text-ink">
                Logged — reference <code className="font-mono">{ref}</code>.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
