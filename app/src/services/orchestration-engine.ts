// Sovereign Orchestration Engine — federation app registry.
//
// The platform shell is NOT the government. Institutional applications are
// independent units that REGISTER with the orchestration engine when
// provisioned/activated. The platform consumes this registry to build
// EMERGENT navigation, routing and command surfaces — nothing institutional
// is hardcoded into the shell. Pure runtime singleton.

import { publish, subscribe as busSubscribe } from '@/services/event-bus';

export interface AppNavSection { key: string; label: string }
export interface AppManifest {
  /** federation id, e.g. 'ministry-health', 'judiciary' */
  id: string;
  label: string;
  /** sovereign domain route segment, e.g. 'health' → health.gov.country */
  domain: string;
  kind: 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';
  /** archetype or branch key this app operationalises */
  archetypeOrBranch: string;
  nav: AppNavSection[];
  /** institution instance id once provisioned (ministry id / branch key) */
  instanceId?: string;
}

export interface RegisteredApp extends AppManifest {
  registeredAt: number;
  activated: boolean;
  activatedAt?: number;
}

type Listener = () => void;
const registry = new Map<string, RegisteredApp>();
const listeners = new Set<Listener>();
let _version = 0;
/** Stable snapshot for useSyncExternalStore — changes only on mutation. */
export function version(): number { return _version; }
const emit = () => { _version++; for (const l of listeners) l(); };

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Register an institutional application (idempotent by id+instance). */
export function registerApp(manifest: AppManifest): RegisteredApp {
  const key = manifest.instanceId ? `${manifest.id}:${manifest.instanceId}` : manifest.id;
  const existing = registry.get(key);
  if (existing) return existing;
  const app: RegisteredApp = { ...manifest, registeredAt: Date.now(), activated: false };
  registry.set(key, app);
  publish('app.registered', 'orchestration-engine', { id: manifest.id, domain: manifest.domain });
  emit();
  return app;
}

export function activateApp(id: string, instanceId?: string): void {
  const key = instanceId ? `${id}:${instanceId}` : id;
  const app = registry.get(key);
  if (!app || app.activated) return;
  registry.set(key, { ...app, activated: true, activatedAt: Date.now() });
  publish('app.activated', 'orchestration-engine', { id, domain: app.domain });
  emit();
}

export function deactivateApp(id: string, instanceId?: string): void {
  const key = instanceId ? `${id}:${instanceId}` : id;
  const app = registry.get(key);
  if (!app || !app.activated) return;
  registry.set(key, { ...app, activated: false });
  publish('app.deactivated', 'orchestration-engine', { id, domain: app.domain });
  emit();
}

export function listApps(): RegisteredApp[] {
  return [...registry.values()].sort((a, b) => a.label.localeCompare(b.label));
}
export function activatedApps(): RegisteredApp[] {
  return listApps().filter(a => a.activated);
}
export function findApp(idOrDomain: string): RegisteredApp | undefined {
  return [...registry.values()].find(a => a.id === idOrDomain || a.domain === idOrDomain);
}
export function orchestrationStats() {
  const apps = listApps();
  return { registered: apps.length, activated: apps.filter(a => a.activated).length };
}

// Re-export bus subscribe so the platform can react to federation events.
export { busSubscribe as onSovereignEvent };
