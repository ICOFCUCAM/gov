// The states every console component is designed for (plan step I10;
// specification Part 6 §H "States that must be designed explicitly" and plan
// §3.3's list). One catalogue: the gallery (/gov/help/states) renders each
// entry with the component named here, and component-states.test.ts checks
// that every entry renders with an accessible name, a word and a shape (never
// colour alone) and text that reads at 4.5:1 on every ground.
//
// Kept outside any 'use client' module so tests and server pages read it.

export type StateTone = 'neutral' | 'info' | 'ok' | 'warn' | 'alert';

export interface UiState {
  id: string;
  /** The word shown with the state (never colour alone). */
  word: string;
  /** A shape beside the word (aria-hidden; the word carries the meaning). */
  shape: string;
  tone: StateTone;
  /** How assistive technology hears it: a live status, an assertive alert, or nothing extra. */
  live: 'status' | 'alert' | 'none';
  /** The shared component that renders it. */
  component: string;
  /** Where the requirement comes from: the specification's words or the plan's. */
  source: string;
}

export const UI_STATES: UiState[] = [
  { id: 'default', word: 'Ready', shape: '○', tone: 'neutral', live: 'none', component: 'Button, TextField, SelectField, DataTable, Pill', source: 'Spec H "normal"; I10 brief "default"' },
  { id: 'focus', word: 'Focused', shape: '◎', tone: 'info', live: 'none', component: 'globals.css :focus-visible and .focus-ring (lib/theme/tokens.ts FOCUS)', source: 'Spec B "Keyboard focus"; I10 brief "hover/focus-visible"' },
  { id: 'disabled', word: 'Not available', shape: '⊘', tone: 'neutral', live: 'none', component: 'Button, TextField, SelectField (disabled)', source: 'I10 brief "disabled"' },
  { id: 'loading', word: 'Loading', shape: '◌', tone: 'info', live: 'status', component: 'LoadingState, Button busy, DataTable loading, WorkspaceSkeleton', source: 'Spec H "loading"; plan §3.3 "loading"' },
  { id: 'empty', word: 'Nothing yet', shape: '▣', tone: 'neutral', live: 'none', component: 'EmptyState, DataTable empty', source: 'Spec H "Empty: No cases match these filters. Offer a useful next action."' },
  { id: 'error', word: 'Failed', shape: '✕', tone: 'alert', live: 'alert', component: 'StateNotice error (with a retry action)', source: 'Spec H "failed" and "recovery"; plan §3.3 "error"' },
  { id: 'unavailable', word: 'Unavailable', shape: '⌁', tone: 'warn', live: 'status', component: 'StateNotice unavailable (last successful update, never invented)', source: 'Spec H "Unavailable: The source system is not responding. Last successful update: [actual timestamp]."' },
  { id: 'not-connected', word: 'Not connected', shape: '┄', tone: 'neutral', live: 'none', component: 'SignalTag unavailable', source: 'Plan §3.3 "not connected"; CLAUDE.md signal markers' },
  { id: 'refused', word: 'Refused', shape: '⊖', tone: 'alert', live: 'alert', component: 'StateNotice refused with RefusalText', source: 'Spec H "Denied: You do not have permission to perform this action."; plan §3.3 "refused with reason"' },
  { id: 'validation', word: 'Check your answers', shape: '!', tone: 'alert', live: 'alert', component: 'ErrorSummary and TextField error', source: 'Spec H "Validation error: identify the exact field and how to correct it."; Spec E "Error summaries linked to the affected fields"' },
  { id: 'conflict', word: 'Conflict', shape: '⇄', tone: 'warn', live: 'alert', component: 'StateNotice conflict', source: 'Spec H "Conflict: show the conflicting versions and route the record to authorised review."' },
  { id: 'stale', word: 'Out of date', shape: '◷', tone: 'warn', live: 'status', component: 'StateNotice stale', source: 'Spec H "Stale data: identify the source and last update"; plan §3.3 "stale"' },
  { id: 'partial', word: 'Partly done', shape: '◑', tone: 'warn', live: 'alert', component: 'StateNotice partial', source: 'Spec H "Partial success: which operations succeeded, which failed and whether retrying is safe."; plan §3.3 "partial"' },
  { id: 'integrity', word: 'Verification failed', shape: '△', tone: 'alert', live: 'alert', component: 'StateNotice integrity', source: 'Spec H "Integrity failure: clearly warn that verification failed"' },
  { id: 'session', word: 'Signed out', shape: '⊙', tone: 'warn', live: 'alert', component: 'StateNotice session', source: 'Spec H "Session expiry: preserve unsaved work where safe, explain what happened and provide secure re-authentication."' },
  { id: 'waiting', word: 'Waiting for a second official', shape: '⧗', tone: 'info', live: 'status', component: 'StateNotice waiting', source: 'Plan §3.3 "waiting for a second official"' },
  { id: 'sample', word: 'Sample', shape: '┄', tone: 'neutral', live: 'none', component: 'SignalTag sample', source: 'Plan §3.3 "sample"; CLAUDE.md signal markers' },
  { id: 'simulated', word: 'Simulation', shape: '┄', tone: 'neutral', live: 'none', component: 'SignalTag simulated, SimulationNotice', source: 'Plan §3.3 "simulated"' },
  { id: 'offline', word: 'Offline', shape: '⊗', tone: 'warn', live: 'status', component: 'StateNotice offline (OfflineBanner)', source: 'Plan §3.3 "offline"' },
];

export const uiState = (id: string): UiState => {
  const s = UI_STATES.find(x => x.id === id);
  if (!s) throw new Error(`No UI state ${id}`);
  return s;
};
