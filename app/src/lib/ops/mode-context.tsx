'use client';

// The installation's mode for client components (lib/ops/mode.ts decides it on
// the server; CIVICOS_MODE is not in the browser bundle). The root layout
// provides it; a component outside the provider is told 'production', so it
// fails closed: no sample figure shown as the nation's.

import * as React from 'react';
import type { InstallationMode } from './mode';

const Mode = React.createContext<InstallationMode>('production');

export function InstallationModeProvider({ mode, children }: { mode: InstallationMode; children: React.ReactNode }) {
  return <Mode.Provider value={mode}>{children}</Mode.Provider>;
}

export const useInstallationMode = (): InstallationMode => React.useContext(Mode);
/** Sample figures may be shown (demo and training); false in production and outside the provider. */
export const useSamplesAllowed = (): boolean => React.useContext(Mode) !== 'production';
