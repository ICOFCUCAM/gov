'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';

/** SystemMap — static flow diagram of the substrate. Hand-laid SVG.
 *  Two layers — substrate write paths (left) and read surfaces (right)
 *  with directional arrows showing how data flows from the contracts
 *  through the views into the operator surfaces. Each label is a link
 *  to the relevant in-app surface. */
export function SystemMap() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">System map</h2>
        <span className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
          style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}>
          static · click any node
        </span>
      </div>

      <Panel title="Substrate flow" meta="contracts → tables → views → surfaces" bodyClass="!p-3">
        <svg viewBox="0 0 920 540" className="block w-full" role="img" aria-label="system map">
          {/* Lane labels */}
          <text x="80"  y="30" fontSize="10" fill="rgb(var(--c-ink-muted))" fontFamily="ui-monospace, monospace" letterSpacing="2">WRITE PATHS</text>
          <text x="460" y="30" fontSize="10" fill="rgb(var(--c-ink-muted))" fontFamily="ui-monospace, monospace" letterSpacing="2">SUBSTRATE</text>
          <text x="700" y="30" fontSize="10" fill="rgb(var(--c-ink-muted))" fontFamily="ui-monospace, monospace" letterSpacing="2">READ SURFACES</text>

          {/* arrows */}
          {[60, 130, 200, 270, 340, 410, 480].map(y => (
            <g key={y}>
              <line x1="220" x2="430" y1={y} y2={y} stroke="rgb(var(--c-line))" strokeWidth="0.5" />
              <line x1="600" x2="690" y1={y} y2={y} stroke="rgb(var(--c-line))" strokeWidth="0.5" />
            </g>
          ))}

          {/* WRITE PATHS (left lane) */}
          {[
            ['Citizen wallet',       '/wallet/substrate', 60],
            ['Officer workbench',    '/gov/workbench',    130],
            ['Directive board',      '/gov/directives',   200],
            ['Dispatch board',       '/gov/dispatches',   270],
            ['Escalation floor',     '/gov/escalations',  340],
            ['Posture board',        '/gov/posture',      410],
            ['SLA / metrics / digest cron', '/gov/crons', 480],
          ].map(([label, href, y]) => (
            <foreignObject key={String(y)} x="60" y={(y as number) - 12} width="160" height="22">
              <Node href={href as string} label={label as string} />
            </foreignObject>
          ))}

          {/* SUBSTRATE column — RPC contracts box */}
          <rect x="430" y="40" width="170" height="460" rx="4" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" />
          <text x="515" y="60" fontSize="10" fill="rgb(var(--c-ink))" fontFamily="ui-monospace, monospace" textAnchor="middle">civicos.*</text>
          {[
            ['append_audit',          80],
            ['publish_event',         110],
            ['open_work_item',        140],
            ['transition_work_item',  170],
            ['record_directive',      200],
            ['record_dispatch',       230],
            ['record_escalation',     260],
            ['record_posture',        290],
            ['record_telemetry…',     320],
            ['submit_service_req…',   350],
            ['grant/revoke_consent',  380],
            ['file/decide_appeal',    410],
            ['register_signing_key',  440],
            ['escalate_stale_…',      470],
          ].map(([label, y]) => (
            <text key={String(y)} x="440" y={y as number} fontSize="9" fill="rgb(var(--c-ink-soft))" fontFamily="ui-monospace, monospace">{label as string}</text>
          ))}

          {/* READ SURFACES (right lane) */}
          {[
            ['Live wall',          '/gov/live',         60],
            ['Audit explorer',     '/gov/audit',        130],
            ['Federation stream',  '/gov/federation',   200],
            ['Telemetry wall',     '/gov/telemetry',    270],
            ['Notifications',      '/gov/alerts',       340],
            ['Activity log',       '/gov/activity',     410],
            ['Substrate status',   '/gov/substrate',    480],
          ].map(([label, href, y]) => (
            <foreignObject key={String(y)} x="690" y={(y as number) - 12} width="200" height="22">
              <Node href={href as string} label={label as string} />
            </foreignObject>
          ))}
        </svg>
      </Panel>

      <Panel title="Key principles" meta="—" bodyClass="!p-3 text-[11px] space-y-1">
        <ul className="list-disc pl-5 text-ink">
          <li>Every substrate write goes through a SECURITY DEFINER RPC.</li>
          <li>Every read goes through a security-invoker public view with RLS on the underlying table.</li>
          <li>Identity (auth.uid()) is enforced by the substrate, not the client.</li>
          <li>Officers' signing keys live in IndexedDB; signatures are ECDSA P-256 and verifiable offline.</li>
          <li>Realtime publications propagate every event-bearing change to subscribed surfaces.</li>
          <li>Audit chain is hash-linked per scope and verifiable from any session via verify_audit_chain.</li>
        </ul>
      </Panel>
    </div>
  );
}

function Node({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block h-full w-full rounded-[3px] border border-line bg-surface px-2 py-0.5 text-[10px] text-link hover:bg-surface-2"
      style={{ textAlign: 'center', lineHeight: '20px' }}>
      {label}
    </Link>
  );
}
