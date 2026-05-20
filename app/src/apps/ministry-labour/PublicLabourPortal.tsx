'use client';

// Labour — Public Labour & Welfare Portal.
// Employment application queue, pension access cards, complaint
// ledger, vocational enrolment lanes, advisory feed. Distinct from
// Justice / Foreign Affairs / Energy portals — uses 5-stage pip rails.

import * as React from 'react';
import { labourExtendedBoard, type EmploymentApplication, type PensionAccessRequest, type LabourComplaint, type VocationalEnrolmentFlow, type PublicAdvisoryLabour } from '@/lib/gov/labour-extended';

const CIVIC = '#2e6aa6';
const TEAL = '#3a8a82';
const COPPER = '#a45f3a';
const AMBER = '#c08b3a';
const SLATE = '#5e6770';
const SLATE_DEEP = '#1d2128';
const PAPER = '#f4efe5';
const PANEL = '#262b33';
const PANEL2 = '#2e343d';
const INK = '#dad8d0';
const MUT = '#8a8e95';
const ALERT = '#b04030';

const APP_STAGES: EmploymentApplication['status'][] = ['received', 'screening', 'matching', 'interview', 'placed'];
const APP_COL: Record<EmploymentApplication['status'], string> = {
  received: SLATE, screening: CIVIC, matching: AMBER, interview: COPPER, placed: TEAL,
};
const APPLICANT_LABEL: Record<EmploymentApplication['applicant'], string> = {
  jobseeker: 'Jobseeker', youth: 'Youth', returner: 'Returner', 'displaced-worker': 'Displaced', apprentice: 'Apprentice', migrant: 'Migrant',
};
const PENSION_COL: Record<PensionAccessRequest['status'], string> = {
  submitted: SLATE, verifying: CIVIC, approved: AMBER, disbursed: TEAL,
};
const PENSION_LABEL: Record<PensionAccessRequest['scheme'], string> = {
  'state-pension': 'State pension', occupational: 'Occupational', disability: 'Disability', survivor: 'Survivor', 'early-retirement': 'Early retirement', 'rural-elder': 'Rural elder',
};
const COMPLAINT_COL: Record<LabourComplaint['severity'], string> = {
  standard: SLATE, serious: AMBER, critical: ALERT,
};
const STAGE_COL: Record<LabourComplaint['stage'], string> = {
  received: SLATE, investigating: CIVIC, mediation: AMBER, tribunal: COPPER, resolved: TEAL,
};
const VOC_LABEL: Record<VocationalEnrolmentFlow['programme'], string> = {
  apprenticeship: 'Apprenticeship', reskilling: 'Reskilling', upskilling: 'Upskilling',
  'youth-pathway': 'Youth pathway', 'returner-bridging': 'Returner bridging', 'rural-vocational': 'Rural vocational',
};
const ADVISORY_GLYPH: Record<PublicAdvisoryLabour['kind'], string> = {
  'sector-shortage': '⚙', 'reskilling-cohort': '✦', 'pension-reform-notice': '◇', 'workplace-safety-campaign': '⊕', 'welfare-coverage-update': '◈', 'youth-pathway-open': '↗',
};

function AppStagePips({ status }: { status: EmploymentApplication['status'] }) {
  const idx = APP_STAGES.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {APP_STAGES.map((s, i) => (
        <React.Fragment key={s}>
          <span className="block rounded-full" style={{
            width: i === idx ? 7 : 4, height: i === idx ? 7 : 4,
            background: i <= idx ? APP_COL[status] : 'rgba(218,216,208,0.18)',
          }} />
          {i < APP_STAGES.length - 1 ? <span className="block h-px w-3" style={{ background: i < idx ? APP_COL[status] : 'rgba(218,216,208,0.12)' }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function PublicLabourPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = labourExtendedBoard(now);
  const p = b.portal;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #2a2f36 0%, #1d2128 100%)', borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>Public Labour &amp; Welfare Portal</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>
              {p.employmentApplications.length} active employment applications · {p.complaints.length} complaints · {p.citizenContactsDailyK}K citizen contacts/day
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center" style={{ minWidth: '360px' }}>
            {[
              { l: 'Portal uptime', v: `${p.portalAvailabilityPct}%`, c: p.portalAvailabilityPct >= 99 ? TEAL : AMBER },
              { l: 'Critical complaints', v: p.complaints.filter(c => c.severity === 'critical').length, c: ALERT },
              { l: 'Advisories live', v: p.advisories.length, c: CIVIC },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[15px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Employment applications */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP, borderBottom: `1px solid ${SLATE}40` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↗ Employment applications · 5-stage pipeline</h3>
        <div className="overflow-hidden rounded-md" style={{ background: PANEL }}>
          <div className="grid grid-cols-[80px_120px_100px_140px_1fr_70px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>ID</span><span>Applicant</span><span>Region</span><span>Sector preference</span><span>Stage pipeline</span><span className="text-right">Days</span>
          </div>
          {p.employmentApplications.map(a => (
            <div key={a.id} className="grid grid-cols-[80px_120px_100px_140px_1fr_70px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${SLATE_DEEP}` }}>
              <span className="tabular-nums" style={{ color: AMBER }}>{a.id}</span>
              <span style={{ color: PAPER }}>{APPLICANT_LABEL[a.applicant]}</span>
              <span style={{ color: INK }}>{a.region}</span>
              <span style={{ color: INK }}>{a.sectorPreference}</span>
              <AppStagePips status={a.status} />
              <span className="text-right tabular-nums" style={{ color: MUT }}>{a.daysOpen}d</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pension + Complaints */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-2" style={{ background: `${SLATE}40` }}>
        <div className="px-8 py-6" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>◇ Pension access requests</h3>
          <div className="space-y-1.5">
            {p.pensionRequests.map(pr => (
              <div key={pr.id} className="grid grid-cols-[80px_1fr_100px_90px] items-center gap-2 px-3 py-2 rounded-md" style={{ background: PANEL2 }}>
                <span className="tabular-nums text-[9.5px]" style={{ color: AMBER }}>{pr.id}</span>
                <div>
                  <div className="text-[11px]" style={{ color: PAPER }}>{PENSION_LABEL[pr.scheme]}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{pr.daysOpen}d open</div>
                </div>
                <span className="text-right tabular-nums text-[11px]" style={{ color: TEAL }}>{pr.amountMonthly}/mo</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: PENSION_COL[pr.status] }}>● {pr.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-8 py-6" style={{ background: PANEL2 }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>✉ Labour complaints · severity-sorted</h3>
          <div className="space-y-1.5">
            {p.complaints.map(c => (
              <div key={c.id} className="grid grid-cols-[80px_1fr_60px_100px] items-center gap-2 px-3 py-2 rounded-md" style={{ background: PANEL, borderLeft: `2px solid ${COMPLAINT_COL[c.severity]}` }}>
                <span className="tabular-nums text-[9.5px]" style={{ color: AMBER }}>{c.id}</span>
                <div>
                  <div className="text-[11px]" style={{ color: PAPER }}>{c.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{c.region} · {c.daysOpen}d</div>
                </div>
                <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: COMPLAINT_COL[c.severity] }}>● {c.severity}</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.18em]" style={{ color: STAGE_COL[c.stage] }}>· {c.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vocational programmes + Advisories */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_340px]" style={{ background: `${SLATE}40` }}>
        <div className="px-8 py-6" style={{ background: SLATE_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>✦ Vocational enrolment lanes · 6 programmes</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {p.vocationalEnrolments.map(v => (
              <article key={v.programme} className="rounded-md px-4 py-3" style={{ background: PANEL, borderTop: `2px solid ${TEAL}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px]" style={{ color: PAPER }}>{VOC_LABEL[v.programme]}</span>
                  <span className="text-[9.5px] tabular-nums" style={{ color: AMBER }}>{v.enrolledThisMonthK}K/mo</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Completion</div>
                    <div className="tabular-nums text-[13px]" style={{ color: v.completionRatePct >= 80 ? TEAL : AMBER }}>{v.completionRatePct}%</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Placement</div>
                    <div className="tabular-nums text-[13px]" style={{ color: v.placementRatePct >= 70 ? TEAL : AMBER }}>{v.placementRatePct}%</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Waitlist</div>
                    <div className="tabular-nums text-[13px]" style={{ color: v.waitlistMonths >= 6 ? COPPER : INK }}>{v.waitlistMonths}mo</div>
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full" style={{ background: SLATE_DEEP }}>
                  <div className="h-full rounded-full" style={{ width: `${v.placementRatePct}%`, background: TEAL }} />
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="px-6 py-6" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>📡 Public advisories · live feed</h3>
          <div className="space-y-2">
            {p.advisories.map(a => (
              <div key={a.id} className="rounded-md px-3 py-2.5" style={{ background: SLATE_DEEP, borderLeft: `2px solid ${CIVIC}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px]" style={{ color: CIVIC }}>{ADVISORY_GLYPH[a.kind]}</span>
                  <span className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: MUT }}>{a.ageHrs}h</span>
                </div>
                <div className="mt-1 text-[11px]" style={{ color: PAPER }}>{a.kind.replace(/-/g, ' ')}</div>
                <div className="text-[9.5px]" style={{ color: MUT }}>{a.region}</div>
                <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>reach <span className="tabular-nums">{a.reachM}M</span></div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
