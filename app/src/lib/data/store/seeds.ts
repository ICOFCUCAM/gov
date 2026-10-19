// Sample queues and incidents for a ministry, seeded on first read (shared by
// the ministries and national contexts; not re-exported by the barrel).
import type { ArchetypeKey, MinistryIncident, QueueItem, QueuePriority } from '@/lib/api/types';
import { profileFor } from '@/lib/archetype-profiles';
import { db } from './state';
import { seededInt, REGIONS } from './shared';

const PRIORITIES: QueuePriority[] = ['routine', 'elevated', 'urgent'];

export function seedQueue(id: string): QueueItem[] {
  const m = db.ministries.find(x => x.id === id);
  const count = 9;
  const items: QueueItem[] = [];
  // Health: lead with real open permits as licensing items.
  if (m?.archetype === 'HEALTH') {
    db.permits
      .filter(p => ['submitted', 'in-review', 'needs-info'].includes(p.status))
      .forEach(p => {
        items.push({
          id: `Q-${p.id}`,
          ref: p.id,
          subject: p.title,
          region: REGIONS[0]!,
          ageHours: Math.max(1, Math.round((Date.now() - new Date(p.submittedAt ?? Date.now()).getTime()) / 3_600_000)),
          priority: 'elevated',
          state: 'open',
          source: 'sample',
        });
      });
  }
  for (let i = items.length; i < count; i++) {
    const pr = PRIORITIES[seededInt(`${id}:q:${i}:pr`, 0, 2)]!;
    items.push({
      id: `Q-${id.slice(-4)}-${i}`,
      ref: `APP-${seededInt(`${id}:q:${i}:r`, 1000, 9999)}`,
      subject: m ? profileFor(m.archetype).queueSubject : 'Service application',
      region: REGIONS[seededInt(`${id}:q:${i}:rg`, 0, REGIONS.length - 1)]!,
      ageHours: seededInt(`${id}:q:${i}:a`, 2, 360),
      priority: pr,
      state: 'open',
      source: 'sample',
    });
  }
  return items;
}

export function seedIncidents(id: string, archetype: ArchetypeKey): MinistryIncident[] {
  const prof = profileFor(archetype);
  return prof.incidentTypes.map(t => {
    const roll = seededInt(`${id}:inc:${t.key}`, 0, 100) / 100;
    return {
      key: t.key,
      label: t.label,
      severity: t.severity,
      detail: t.detail,
      active: roll < t.likelihood,
      tierIndex: 0,
    };
  });
}
