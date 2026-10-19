// Every index the client engines (lib/gov/*) compute and the console shows
// (review M1–M3, register 16.3): each numeric field named …Index or …Score in
// an engine's exported shapes. Each is one of two things, never neither
// (engine-indexes.test.ts finds them all in the engine sources and fails on
// one missing here, and on a screen that shows one without its marker):
//
//   derived   a formula over metrics the twin observes (lib/twin/derived.ts):
//             the engine reads it through the twin read API (readTwinValue),
//             which answers it modelled, with its inputs, once they are
//             observed, and the engine's own value marked sample until then
//   modelled  a composite of other figures with weights the reference model
//             chose: it has no metric equivalent, so it is shown as a
//             modelled index, marked on screen with <IndexTag> (a SignalTag
//             "Modelled" naming what it combines), never as observed
//
// Pure data: runs in the browser.

import type { SignalKind } from './signal';

export type IndexTreatment = { derived: string } | { modelled: string };

export interface EngineIndex {
  /** The engine file (lib/gov/…) and the field, as `file · field`. */
  key: string;
  label: string;
  treatment: IndexTreatment;
}

const m = (key: string, label: string, modelled: string): EngineIndex => ({ key, label, treatment: { modelled } });
const d = (key: string, label: string, derived: string): EngineIndex => ({ key, label, treatment: { derived } });

export const ENGINE_INDEXES: readonly EngineIndex[] = [
  // Derived from observed metrics.
  d('health-systems.ts · mortalityIndex', 'Hospital mortality', 'health.hospital_mortality'),
  d('workforce-continuity.ts · agingIndex', 'Share aged 65 and over', 'population.share_65_plus'),
  // Modelled composites of the reference model.
  m('agriculture-systems.ts · foodSecurityIndex', 'Food-security index', 'the reference model\'s food-security reading (production, stocks and prices are not yet connected)'),
  m('archetype-operations.ts · postureIndex', 'Sector posture index', 'half the sector\'s mean operational level, half the count of domains in a critical state'),
  m('citizen-public-brief.ts · trustIndex', 'Institutional trust index', 'the mean of the regions\' modelled trust (civic-legitimacy board)'),
  m('civic-legitimacy.ts · trustIndex', 'Institutional trust index', 'the mean of the regions\' modelled trust'),
  m('civilizational-identity.ts · civicBelongingIndex', 'Civic belonging index', 'the mean of the regions\' modelled civic belonging'),
  m('climate-resilience.ts · airQualityIndex', 'Air-quality index', 'the environment ministry\'s modelled air-quality reading (no air-quality stations connected)'),
  m('education-systems.ts · researchOutputIndex', 'Research output index', 'the reference model\'s research output reading'),
  m('education-systems.ts · postureIndex', 'Education posture index', 'half the sector\'s stability, half the count of domains in a critical state'),
  m('energy-systems.ts · postureIndex', 'Energy posture index', 'half the sector\'s stability, half the count of domains in a critical state'),
  m('environment-systems.ts · airQualityIndex', 'Air-quality index', 'the reference model\'s air-quality reading (no air-quality stations connected)'),
  m('governance-pulse.ts · dominantIndex', 'Dominant layer index', 'the index of the governance layer under the most pressure'),
  m('health-operations.ts · systemicRiskIndex', 'Systemic risk index', 'the mean of the modelled collapse risks'),
  m('health-operations.ts · healthScore', 'Health score', 'the reference model\'s health reading for a sample citizen or population'),
  m('health-operations.ts · mortalityIndex', 'National mortality index', 'the reference model\'s national mortality reading'),
  m('health-operations.ts · riskScore', 'Clinical risk score', 'the reference model\'s risk reading for a sample patient'),
  m('health-systems.ts · capacityIndex', 'Healthcare capacity index', 'bed, intensive-care, ambulance and doctor availability, weighted 30, 35, 20 and 15'),
  m('health-systems.ts · complianceIndex', 'Health compliance index', '100 less breaches and overdue reviews'),
  m('health-systems.ts · postureIndex', 'Health posture index', 'half the institutions\' state, half the count of domains in a critical state'),
  m('institutional-economy.ts · resilienceScore', 'Regional resilience score', '100 less regional strain, fatigue and suspicious activity'),
  m('interior-systems.ts · publicOrderIndex', 'Public-order index', 'the reference model\'s public-order reading'),
  m('justice-systems.ts · accessToJusticeIndex', 'Access-to-justice index', 'the reference model\'s access-to-justice reading'),
  m('knowledge-continuity.ts · constitutionalLiteracyIndex', 'Constitutional literacy index', 'the mean of the regions\' modelled constitutional literacy'),
  m('knowledge-continuity.ts · civicConfusionIndex', 'Civic confusion index', 'distrust and the modelled normalisation of corruption'),
  m('national-stability.ts · stabilityIndex', 'Stability index', 'the mean of the role areas\' modelled stability'),
  m('presidency-engine.ts · approvalIndex', 'Approval index', 'the reference model\'s approval reading (no survey connected)'),
  m('sovereign-operating-model.ts · productionIndex', 'Production index', 'modelled industrial and repair output'),
  m('sovereign-operating-model.ts · capabilityIndex', 'Capability index', 'modelled national capabilities combined'),
  m('sovereign-operating-model.ts · resilienceScore', 'Resilience score', 'how a modelled stress exercise is withstood'),
  m('sovereign-operating-model.ts · civScore', 'Civilisational condition score', 'modelled institutional health and memory'),
  m('territorial-continuity.ts · scarcityIndex', 'Scarcity index', 'modelled water availability and agricultural instability'),
  m('transport-systems.ts · safetyIndex', 'Transport safety index', 'the reference model\'s safety reading'),
  m('transport-systems.ts · postureIndex', 'Transport posture index', 'half the sector\'s stability, half the count of domains in a critical state'),
  m('treasury-systems.ts · postureIndex', 'Treasury posture index', 'half the sector\'s stability, half the count of domains in a critical state'),
];

/** Fields that end in Index but are positions, not figures. */
export const NOT_INDEXES: Readonly<Record<string, string>> = {
  'institution-chain.ts · stageIndex': 'a position in a record\'s lineage',
  'procedural-execution.ts · stageIndex': 'a position in a procedure',
};

export type EngineIndexKey = (typeof ENGINE_INDEXES)[number]['key'];

export const engineIndex = (key: string): EngineIndex | undefined => ENGINE_INDEXES.find(e => e.key === key);

/** How a screen marks an index: its signal kind and where it comes from (the derived kind is the twin's answer, or sample until it answers). */
export function indexSignal(key: string, derivedKind?: SignalKind): { kind: SignalKind; source: string } {
  const e = engineIndex(key);
  if (!e) return { kind: 'modelled', source: 'Modelled index' };
  if ('modelled' in e.treatment) return { kind: 'modelled', source: `Modelled index: ${e.treatment.modelled}` };
  return derivedKind === 'modelled'
    ? { kind: 'modelled', source: `Derived from observed figures (${e.treatment.derived})` }
    : { kind: 'sample', source: `Sample until the twin observes the inputs of ${e.treatment.derived}` };
}
