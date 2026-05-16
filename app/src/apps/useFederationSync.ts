'use client';

import * as React from 'react';
import type { Ministry } from '@/lib/api/types';
import { registerApp, activateApp, deactivateApp } from '@/services/orchestration-engine';
import { ministryAppManifest, STANDING_APPS } from '@/apps/manifests';

let standingRegistered = false;

/**
 * Federation sync — keeps the orchestration registry an EMERGENT mirror of
 * provisioned institutions. Standing branch/agency apps register once;
 * ministry apps register & (de)activate as their instances change. The
 * platform shell then derives navigation from the registry, not hardcode.
 */
export function useFederationSync(mins: Ministry[]): void {
  React.useEffect(() => {
    if (!standingRegistered) {
      for (const a of STANDING_APPS) {
        registerApp(a);
        activateApp(a.id, a.instanceId);
      }
      standingRegistered = true;
    }
  }, []);

  React.useEffect(() => {
    for (const m of mins) {
      const manifest = ministryAppManifest(m);
      registerApp(manifest);
      if (m.status === 'active') activateApp(manifest.id, m.id);
      else deactivateApp(manifest.id, m.id);
    }
  }, [mins]);
}
