// The national snapshot with what the twin knows: a figure observed from a
// registered source replaces the reference model's sample or "not connected"
// (lib/twin/register.ts). Composed here, at the API, so the store and the
// twin do not depend on each other.

import type { NationalSnapshot } from '@/lib/api/types';
import { nationalTotal, syncRegister } from './register';

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}` : n.toLocaleString('en'));

export async function withTwin(snap: NationalSnapshot): Promise<NationalSnapshot> {
  await syncRegister();
  const pop = nationalTotal('population');
  if (!pop?.value) return snap;
  return {
    ...snap,
    indicators: snap.indicators.map(i => (i.label === 'Population'
      ? { label: 'Population', value: fmt(pop.value!), unit: pop.value! >= 1e6 ? 'M' : '', kind: 'observed', source: `${pop.source}, ${pop.asOf}` }
      : i)),
  };
}
