'use client';

// apps/treasury/design-system — the sovereign Treasury design system.
// The grammar is the fiscal ledger: double-entry T-accounts, columned
// statements, sealed disbursement vouchers, and rate-of-flow gauges.
// Every Treasury domain renders through this system so the ministry
// is structurally distinct from the docket-chamber (Justice), the
// situation-room (Interior) and any other grammar.

import * as React from 'react';

// ── Tokens ─────────────────────────────────────────────────────────
// Fiscal palette: vault green / ink black / parchment / brass / red
// for deficit. Restrained, government-grade, no SaaS gradients.
export const TREASURY_DS = {
  vault: '#0d3f2e',          // sovereign vault green (debit side)
  vaultDeep: '#062119',
  brass: '#a17b3e',          // brass detailing on the ledger
  brassDim: '#7a5b2c',
  parchment: '#ebe5d2',
  parchmentDim: '#c9bf9b',
  inkBlack: '#15171a',
  ink: '#d0d4d8',
  mut: '#7f8590',
  deficit: '#a8332a',        // red for deficit / over-spend
  surplus: '#3a8a5e',        // surplus / credit
  navy: '#21364f',           // sovereign authority
  rule: 'rgba(161,123,62,0.28)',
  ruleSoft: 'rgba(161,123,62,0.14)',
} as const;

// ── Layout archetypes ─────────────────────────────────────────────
export type TreasuryArchetype =
  | 'command'          // fiscal command surfaces (posture, single account)
  | 'ledger'           // double-entry / T-account / appropriation ledger
  | 'statement'        // columned fiscal statement
  | 'voucher'          // disbursement / receipt voucher
  | 'gauge'            // rate-of-flow / liquidity gauge
  | 'register'         // taxpayer / vendor / contract register
  | 'audit'            // assurance / reconciliation / audit trail
  | 'portal';          // citizen-facing fiscal services

const ARCHETYPE: Record<TreasuryArchetype, { tag: string; glyph: string; accent: string }> = {
  command: { tag: 'FISCAL COMMAND', glyph: '⌘', accent: TREASURY_DS.vault },
  ledger: { tag: 'PUBLIC LEDGER', glyph: '⎯', accent: TREASURY_DS.brass },
  statement: { tag: 'FISCAL STATEMENT', glyph: '⊟', accent: TREASURY_DS.vault },
  voucher: { tag: 'DISBURSEMENT VOUCHER', glyph: '⊡', accent: TREASURY_DS.brass },
  gauge: { tag: 'LIQUIDITY GAUGE', glyph: '◴', accent: TREASURY_DS.surplus },
  register: { tag: 'SOVEREIGN REGISTER', glyph: '▤', accent: TREASURY_DS.brassDim },
  audit: { tag: 'FISCAL ASSURANCE', glyph: '✓', accent: TREASURY_DS.navy },
  portal: { tag: 'CITIZEN FISCAL ACCESS', glyph: '◇', accent: TREASURY_DS.brassDim },
};

// ── LedgerFrame ────────────────────────────────────────────────────
// Standardized chrome — debit/credit column markers, brass rule, vault
// background. Header carries fiscal-year tag and the archetype name.
export function LedgerFrame({
  archetype, ref, title, subtitle, fiscalYear, accent, headerRight, children,
}: {
  archetype: TreasuryArchetype;
  ref: string;        // e.g. "TR-001-A", "VR-2026/01"
  title: string;
  subtitle?: string;
  fiscalYear?: string;
  accent?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const a = ARCHETYPE[archetype];
  const col = accent ?? a.accent;
  return (
    <section
      className="border"
      style={{
        background: TREASURY_DS.inkBlack,
        borderColor: TREASURY_DS.rule,
        color: TREASURY_DS.ink,
        fontFamily: 'ui-monospace, "JetBrains Mono", "Iosevka", monospace',
      }}>
      {/* brass top rule */}
      <div style={{ height: '2px', background: `linear-gradient(90deg, transparent, ${TREASURY_DS.brass}, transparent)` }} />
      <header
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-6 py-3"
        style={{ borderColor: TREASURY_DS.rule, background: 'linear-gradient(180deg, rgba(13,63,46,0.10) 0%, transparent 100%)' }}>
        <span className="text-[14px]" style={{ color: col }}>{a.glyph}</span>
        <span className="tabular-nums text-[11px] uppercase tracking-[0.32em]" style={{ color: col }}>{ref}</span>
        <h3 className="text-[14px] tracking-[0.04em]" style={{ color: TREASURY_DS.parchment, fontFamily: 'ui-serif, Georgia, serif' }}>{title}</h3>
        {subtitle ? <span className="text-[10px] italic" style={{ color: TREASURY_DS.mut }}>· {subtitle}</span> : null}
        <span className="ml-auto text-[9px] uppercase tracking-[0.32em]" style={{ color: TREASURY_DS.mut }}>{a.tag}</span>
        {fiscalYear ? <span className="ml-3 rounded-sm px-2 py-0.5 text-[9px] tabular-nums" style={{ background: `${TREASURY_DS.brass}22`, color: TREASURY_DS.brass }}>FY {fiscalYear}</span> : null}
        {headerRight ? <span className="ml-3">{headerRight}</span> : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── TAccount ───────────────────────────────────────────────────────
// Double-entry T-account — the literal accounting primitive. Debit on
// the left, credit on the right, balance at the foot.
export function TAccount({ title, debit, credit }: {
  title: string;
  debit: { label: string; value: string }[];
  credit: { label: string; value: string }[];
}) {
  const debitTotal = sumValues(debit);
  const creditTotal = sumValues(credit);
  const balance = debitTotal - creditTotal;
  return (
    <div className="border" style={{ borderColor: TREASURY_DS.rule, background: TREASURY_DS.vaultDeep }}>
      <div className="border-b px-3 py-2 text-center text-[11px] uppercase tracking-[0.24em]"
        style={{ borderColor: TREASURY_DS.rule, color: TREASURY_DS.brass, fontFamily: 'ui-serif, Georgia, serif' }}>
        {title}
      </div>
      <div className="grid grid-cols-2">
        <div className="border-r" style={{ borderColor: TREASURY_DS.rule }}>
          <div className="border-b px-3 py-1 text-[9px] uppercase tracking-[0.22em]" style={{ borderColor: TREASURY_DS.ruleSoft, color: TREASURY_DS.mut }}>DEBIT</div>
          {debit.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 border-b px-3 py-1 text-[10.5px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.ink }}>{d.label}</span>
              <span className="tabular-nums" style={{ color: TREASURY_DS.parchment }}>{d.value}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 text-[10.5px]" style={{ background: 'rgba(13,63,46,0.18)' }}>
            <span style={{ color: TREASURY_DS.brass }}>Total debit</span>
            <span className="tabular-nums" style={{ color: TREASURY_DS.parchment }}>{formatCurrency(debitTotal)}</span>
          </div>
        </div>
        <div>
          <div className="border-b px-3 py-1 text-[9px] uppercase tracking-[0.22em]" style={{ borderColor: TREASURY_DS.ruleSoft, color: TREASURY_DS.mut }}>CREDIT</div>
          {credit.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 border-b px-3 py-1 text-[10.5px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
              <span style={{ color: TREASURY_DS.ink }}>{c.label}</span>
              <span className="tabular-nums" style={{ color: TREASURY_DS.parchment }}>{c.value}</span>
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 text-[10.5px]" style={{ background: 'rgba(13,63,46,0.18)' }}>
            <span style={{ color: TREASURY_DS.brass }}>Total credit</span>
            <span className="tabular-nums" style={{ color: TREASURY_DS.parchment }}>{formatCurrency(creditTotal)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border-t" style={{ borderColor: TREASURY_DS.brass }}>
        <div className="px-3 py-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: TREASURY_DS.mut }}>balance</div>
        <div className="px-3 py-2 text-right tabular-nums text-[12px]" style={{ color: balance >= 0 ? TREASURY_DS.surplus : TREASURY_DS.deficit }}>
          {balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(balance))}
        </div>
      </div>
    </div>
  );
}

// ── StatementColumn ────────────────────────────────────────────────
// Three-column fiscal statement row. The primary tabular primitive
// for revenue / expenditure / variance views.
export function StatementColumn({ rows }: {
  rows: { label: string; appropriated: string; spent: string; variance: number; tone?: string }[];
}) {
  return (
    <div>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b py-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: TREASURY_DS.mut, borderColor: TREASURY_DS.rule }}>
        <span>Line item</span>
        <span className="text-right">Appropriated</span>
        <span className="text-right">Spent</span>
        <span className="text-right">Variance</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b py-1.5 text-[11px]" style={{ borderColor: TREASURY_DS.ruleSoft }}>
          <span style={{ color: TREASURY_DS.parchment }}>{r.label}</span>
          <span className="text-right tabular-nums" style={{ color: TREASURY_DS.ink }}>{r.appropriated}</span>
          <span className="text-right tabular-nums" style={{ color: TREASURY_DS.ink }}>{r.spent}</span>
          <span className="text-right tabular-nums" style={{ color: r.variance >= 0 ? TREASURY_DS.surplus : TREASURY_DS.deficit }}>
            {r.variance >= 0 ? '+' : '−'}{Math.abs(r.variance)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── VoucherStamp ───────────────────────────────────────────────────
// Disbursement / receipt voucher card. Visually echoes a stamped
// government voucher: ID strip, parties, amount, fiscal-year stamp,
// authorisation seal.
export function VoucherStamp({ ref, party, counterparty, amount, fiscalYear, authority, status, statusColor }: {
  ref: string; party: string; counterparty: string; amount: string;
  fiscalYear: string; authority: string;
  status: string; statusColor?: string;
}) {
  return (
    <article className="relative border" style={{ background: TREASURY_DS.vaultDeep, borderColor: TREASURY_DS.brass, padding: '12px 16px' }}>
      <div className="absolute right-2 top-2 rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-[0.22em]"
        style={{ borderColor: TREASURY_DS.brass, color: TREASURY_DS.brass }}>FY {fiscalYear}</div>
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.32em]" style={{ color: TREASURY_DS.mut }}>Voucher</div>
          <div className="tabular-nums text-[11.5px]" style={{ color: TREASURY_DS.brass }}>{ref}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: TREASURY_DS.mut }}>Payer</div>
          <div className="text-[10.5px]" style={{ color: TREASURY_DS.parchment }}>{party}</div>
        </div>
        <span className="text-[14px]" style={{ color: TREASURY_DS.brass }}>↦</span>
        <div>
          <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: TREASURY_DS.mut }}>Beneficiary</div>
          <div className="text-[10.5px]" style={{ color: TREASURY_DS.parchment }}>{counterparty}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-baseline gap-2 border-t pt-2" style={{ borderColor: TREASURY_DS.ruleSoft }}>
        <span className="text-[10px]" style={{ color: TREASURY_DS.mut }}>amount</span>
        <span className="tabular-nums text-[16px]" style={{ color: TREASURY_DS.parchment }}>{amount}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[9.5px]">
        <span className="italic" style={{ color: TREASURY_DS.mut }}>authority · {authority}</span>
        <span className="uppercase italic tracking-[0.22em]" style={{ color: statusColor ?? TREASURY_DS.brass }}>· {status}</span>
      </div>
    </article>
  );
}

// ── BrassRule ─────────────────────────────────────────────────────
// Sub-section separator — a brass-coloured rule with optional label.
export function BrassRule({ label }: { label?: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <span className="h-px flex-1" style={{ background: TREASURY_DS.brass, opacity: 0.4 }} />
      {label ? <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: TREASURY_DS.brass, fontFamily: 'ui-serif, Georgia, serif' }}>{label}</span> : null}
      <span className="h-px flex-1" style={{ background: TREASURY_DS.brass, opacity: 0.4 }} />
    </div>
  );
}

// ── KpiStrip ──────────────────────────────────────────────────────
// Tabular monospace KPIs. Sparing — only the most fiscal metrics earn
// a slot.
export function KpiStrip({ items }: { items: { label: string; value: string | number; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px md:grid-cols-4" style={{ background: TREASURY_DS.rule }}>
      {items.map((x, i) => (
        <div key={i} className="px-4 py-3" style={{ background: TREASURY_DS.inkBlack }}>
          <div className="text-[9px] uppercase tracking-[0.28em]" style={{ color: TREASURY_DS.mut }}>{x.label}</div>
          <div className="mt-1 tabular-nums text-[17px]" style={{ color: x.tone ?? TREASURY_DS.parchment, fontFamily: 'ui-monospace, monospace' }}>{x.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── SealFooter ────────────────────────────────────────────────────
// Treasury seal — the audit-trail commitment line.
export function SealFooter({ maxim }: { maxim: string }) {
  return (
    <footer
      className="flex items-center justify-center gap-3 border-t px-6 py-3"
      style={{ borderColor: TREASURY_DS.rule, background: 'rgba(13,63,46,0.06)' }}>
      <span style={{ color: TREASURY_DS.brass }}>⊟</span>
      <span className="text-[10px] uppercase tracking-[0.32em]" style={{ color: TREASURY_DS.mut, fontFamily: 'ui-serif, Georgia, serif' }}>{maxim}</span>
      <span style={{ color: TREASURY_DS.brass }}>⊟</span>
    </footer>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function sumValues(rows: { value: string }[]): number {
  let total = 0;
  for (const r of rows) {
    const v = parseFloat(r.value.replace(/[^0-9.-]/g, '')) || 0;
    total += v;
  }
  return total;
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}Bn`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
