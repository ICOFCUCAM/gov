// Citizen & Officer Systems — citizen-facing and internal officer apps.
//
// Citizen Wallet is the citizen-facing sovereign application (identity,
// services, payments, applications). Officer Console is the internal
// disposition surface. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';

export interface CitizenWallet {
  enrolledM: number;
  identityVerifiedPct: number;
  activeServiceRequests: number;
  paymentsTodayM: number;
  applicationsPending: number;
  servicesUptimePct: number;
  channels: { channel: string; uptime: number; tone: 'ok' | 'warn' | 'alert' }[];
  topServices: { service: string; volume: number; slaMetPct: number }[];
}
const CHANNELS = ['Mobile app', 'USSD', 'Web portal', 'Service centre', 'Agent network'];
const SERVICES = ['Identity renewal', 'Tax payment', 'Permit application', 'Benefit claim', 'Health booking', 'Land record'];

export function citizenWallet(id: string, t: number): CitizenWallet {
  return {
    enrolledM: Math.round(wave(`cw:en:${id}`, t, 14, 46) * 10) / 10,
    identityVerifiedPct: Math.round(wave(`cw:iv:${id}`, t, 72, 98)),
    activeServiceRequests: Math.round(wave(`cw:sr:${id}`, t, 2000, 88000)),
    paymentsTodayM: Math.round(wave(`cw:pm:${id}`, t, 0.4, 7.2) * 10) / 10,
    applicationsPending: Math.round(wave(`cw:ap:${id}`, t, 400, 26000)),
    servicesUptimePct: Math.round(wave(`cw:up:${id}`, t, 96, 100) * 100) / 100,
    channels: CHANNELS.map((channel, i) => {
      const u = Math.round(wave(`cw:ch:${id}:${i}`, t, 88, 100));
      return { channel, uptime: u, tone: u >= 98 ? 'ok' : u >= 94 ? 'warn' : 'alert' };
    }),
    topServices: SERVICES.map((service, i) => ({
      service,
      volume: Math.round(wave(`cw:sv:${id}:${i}`, t, 400, 24000)),
      slaMetPct: Math.round(wave(`cw:ss:${id}:${i}`, t, 60, 97)),
    })),
  };
}

export interface OfficerConsole {
  officersOnline: number;
  decisionsQueue: number;
  reviewBacklog: number;
  slaMetPct: number;
  dispositionsToday: number;
  escalationsOpen: number;
  byDesk: { desk: string; queue: number; tone: 'ok' | 'warn' | 'alert' }[];
}
const DESKS = ['Adjudication', 'Verification', 'Appeals', 'Compliance', 'Exceptions'];

export function officerConsole(id: string, t: number): OfficerConsole {
  return {
    officersOnline: Math.round(wave(`oc:on:${id}`, t, 40, 900)),
    decisionsQueue: Math.round(wave(`oc:dq:${id}`, t, 50, 3600)),
    reviewBacklog: Math.round(wave(`oc:rb:${id}`, t, 100, 5200)),
    slaMetPct: Math.round(wave(`oc:sl:${id}`, t, 58, 95)),
    dispositionsToday: Math.round(wave(`oc:dt:${id}`, t, 200, 9800)),
    escalationsOpen: Math.round(wave(`oc:eo:${id}`, t, 0, 60)),
    byDesk: DESKS.map((desk, i) => {
      const q = Math.round(wave(`oc:dk:${id}:${i}`, t, 10, 1400));
      return { desk, queue: q, tone: q >= 900 ? 'alert' : q >= 400 ? 'warn' : 'ok' };
    }),
  };
}
