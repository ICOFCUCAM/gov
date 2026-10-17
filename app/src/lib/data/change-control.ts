// CivicOS — Update Center change control, server-side.
//
// Four-eyes: a production approve or install is proposed by one named
// official and carried out only when a second, different official
// approves it (enforced in decide()). Maintenance calendar: preferred
// weekly windows plus blackout periods the nation defines (elections,
// budget week, emergencies) — scheduling an upgrade into a blackout is
// refused. Change freeze: a switch that blocks new installs except security
// and critical releases, which still need four-eyes. Everything is audited.

import type { Blackout, ChangeControl, MaintenanceSlot } from '@/lib/api/types';
import { recordAudit } from './store';

const g = globalThis as unknown as { __civicosChange?: Record<string, ChangeControl> };
function cdb(): Record<string, ChangeControl> { return (g.__civicosChange ??= {}); }
export function resetChangeControl(): void { g.__civicosChange = {}; }

export function changeControl(nationId: string): ChangeControl {
  return (cdb()[nationId] ??= {
    nationId,
    windows: [{ day: 6, start: '02:00', hours: 4 }, { day: 0, start: '02:00', hours: 4 }],
    blackouts: [],
    fourEyes: true,
  });
}

const name = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function addBlackout(nationId: string, input: { label?: string; kind?: string; start?: string; end?: string; by?: string }): ChangeControl | { error: string; status: number } {
  const by = name(input.by), label = name(input.label);
  if (!by) return { error: 'Name the official adding the blackout', status: 422 };
  if (label.length < 3) return { error: 'Name the blackout (e.g. “General election”)', status: 422 };
  if (!['election', 'budget', 'emergency', 'other'].includes(input.kind ?? '')) return { error: 'Kind must be election, budget, emergency or other', status: 422 };
  const start = Date.parse(input.start ?? ''), end = Date.parse(input.end ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { error: 'Give a start and an end after it', status: 422 };
  const cc = changeControl(nationId);
  const b: Blackout = { id: `BO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, label, kind: input.kind as Blackout['kind'], start: new Date(start).toISOString(), end: new Date(end).toISOString(), by, at: new Date().toISOString() };
  cc.blackouts = [...cc.blackouts, b].sort((x, y) => x.start.localeCompare(y.start));
  recordAudit(by, 'update.change.blackout.add', `UpdateChamber:${nationId}/calendar`, 'ok', `${label} ${b.start} → ${b.end}`);
  return cc;
}

export function removeBlackout(nationId: string, id: string, by: string): ChangeControl | { error: string; status: number } {
  if (!by.trim()) return { error: 'Name the official removing the blackout', status: 422 };
  const cc = changeControl(nationId);
  const b = cc.blackouts.find(x => x.id === id);
  if (!b) return { error: 'Blackout not found', status: 404 };
  cc.blackouts = cc.blackouts.filter(x => x.id !== id);
  recordAudit(by.trim(), 'update.change.blackout.remove', `UpdateChamber:${nationId}/calendar`, 'ok', b.label);
  return cc;
}

export function setWindows(nationId: string, windows: MaintenanceSlot[], by: string): ChangeControl | { error: string; status: number } {
  if (!by.trim()) return { error: 'Name the official changing the windows', status: 422 };
  if (!Array.isArray(windows) || windows.length > 14 || windows.some(w => !Number.isInteger(w.day) || w.day < 0 || w.day > 6 || !/^\d{2}:\d{2}$/.test(w.start) || !(w.hours > 0 && w.hours <= 12))) {
    return { error: 'Each window needs a weekday (0–6), a start time (HH:MM) and 1–12 hours', status: 422 };
  }
  const cc = changeControl(nationId);
  cc.windows = windows.map(w => ({ day: w.day, start: w.start, hours: w.hours }));
  recordAudit(by.trim(), 'update.change.windows', `UpdateChamber:${nationId}/calendar`, 'ok', `${windows.length} weekly windows`);
  return cc;
}

export function setFreeze(nationId: string, on: boolean, input: { by?: string; reason?: string }): ChangeControl | { error: string; status: number } {
  const by = name(input.by), reason = name(input.reason);
  if (!by) return { error: 'Name the official', status: 422 };
  if (on && reason.length < 10) return { error: 'Give the reason for the change freeze (at least 10 characters)', status: 422 };
  const cc = changeControl(nationId);
  if (!!cc.freeze?.on === on) return { error: on ? 'A change freeze is already on' : 'No change freeze is on', status: 409 };
  cc.freeze = { on, by, at: new Date().toISOString(), reason: on ? reason : cc.freeze?.reason ?? '' };
  recordAudit(by, on ? 'update.change.freeze' : 'update.change.unfreeze', `UpdateChamber:${nationId}/calendar`, 'ok', on ? reason : 'freeze lifted');
  return cc;
}

/** The blackout a period overlaps, if any. */
export function blackoutOverlapping(nationId: string, start: number, end: number): Blackout | undefined {
  return changeControl(nationId).blackouts.find(b => Date.parse(b.start) < end && Date.parse(b.end) > start);
}

/** Change freeze: only security and critical releases may be installed. */
export function freezeBlocks(nationId: string, severity: string): string | undefined {
  const f = changeControl(nationId).freeze;
  if (!f?.on || severity === 'security' || severity === 'critical') return undefined;
  return `A change freeze is on (${f.reason}). Only security and critical releases can be installed`;
}
