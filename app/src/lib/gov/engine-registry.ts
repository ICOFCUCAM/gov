// lib/gov/engine-registry.ts
//
// Registry of every Interior continuity engine — used for documentation
// surfaces and invariant tests. Pure data, no runtime side effects.

export interface EngineDescriptor {
  key: string;
  label: string;
  module: string;          // import path (relative to lib/gov)
  composesFrom: string[];  // other engines it imports
  safeguardFamily: string | null;
  layer: 'primary' | 'continuity' | 'apex' | 'meta';
}

export const ENGINE_REGISTRY: EngineDescriptor[] = [
  { key: 'sovereign-observability', label: 'Sovereign Observability', module: 'sovereign-observability', composesFrom: [], safeguardFamily: null, layer: 'primary' },
  { key: 'institutional-economy', label: 'Institutional Economy', module: 'institutional-economy', composesFrom: ['sovereign-observability', 'procedural-execution'], safeguardFamily: null, layer: 'primary' },
  { key: 'procedural-execution', label: 'Procedural Execution', module: 'procedural-execution', composesFrom: ['sovereign-observability'], safeguardFamily: null, layer: 'primary' },
  { key: 'temporal-intelligence', label: 'Temporal Intelligence', module: 'temporal-intelligence', composesFrom: ['institutional-economy'], safeguardFamily: null, layer: 'continuity' },
  { key: 'national-causality', label: 'National Digital Twin', module: 'national-causality', composesFrom: ['institutional-economy', 'temporal-intelligence', 'constitutional-governance'], safeguardFamily: null, layer: 'continuity' },
  { key: 'constitutional-governance', label: 'Constitutional Governance', module: 'constitutional-governance', composesFrom: ['sovereign-observability'], safeguardFamily: null, layer: 'continuity' },
  { key: 'civic-legitimacy', label: 'Civic Legitimacy', module: 'civic-legitimacy', composesFrom: ['institutional-economy', 'sovereign-observability', 'procedural-execution', 'generational-intelligence'], safeguardFamily: 'civic', layer: 'continuity' },
  { key: 'generational-intelligence', label: 'Generational Continuity', module: 'generational-intelligence', composesFrom: ['national-causality', 'institutional-economy', 'temporal-intelligence'], safeguardFamily: null, layer: 'continuity' },
  { key: 'territorial-continuity', label: 'Territorial Continuity', module: 'territorial-continuity', composesFrom: ['national-causality', 'institutional-economy', 'generational-intelligence', 'civic-legitimacy'], safeguardFamily: 'ecological', layer: 'continuity' },
  { key: 'civilizational-identity', label: 'Civilizational Identity', module: 'civilizational-identity', composesFrom: ['civic-legitimacy', 'generational-intelligence', 'territorial-continuity', 'institutional-economy'], safeguardFamily: 'civic-identity', layer: 'continuity' },
  { key: 'knowledge-continuity', label: 'Knowledge Continuity', module: 'knowledge-continuity', composesFrom: ['civic-legitimacy', 'generational-intelligence', 'civilizational-identity', 'institutional-economy'], safeguardFamily: 'knowledge', layer: 'continuity' },
  { key: 'geopolitical-continuity', label: 'Strategic Continuity', module: 'geopolitical-continuity', composesFrom: ['institutional-economy', 'civic-legitimacy', 'generational-intelligence', 'knowledge-continuity', 'territorial-continuity'], safeguardFamily: 'geopolitical', layer: 'continuity' },
  { key: 'existential-continuity', label: 'Existential Continuity', module: 'existential-continuity', composesFrom: ['national-causality', 'institutional-economy', 'civic-legitimacy', 'generational-intelligence', 'territorial-continuity', 'knowledge-continuity', 'geopolitical-continuity'], safeguardFamily: 'existential', layer: 'continuity' },
  { key: 'civilization-organism', label: 'Civilization Organism', module: 'civilization-organism', composesFrom: ['*'], safeguardFamily: null, layer: 'apex' },
  { key: 'continuity-matrix', label: 'Continuity Matrix', module: 'continuity-matrix', composesFrom: ['*'], safeguardFamily: null, layer: 'meta' },
  { key: 'governance-pulse', label: 'Governance Pulse', module: 'governance-pulse', composesFrom: ['civilization-organism'], safeguardFamily: null, layer: 'meta' },
  { key: 'organism-trend', label: 'Organism Trend', module: 'organism-trend', composesFrom: ['civilization-organism'], safeguardFamily: null, layer: 'meta' },
];

export function enginesByLayer(layer: EngineDescriptor['layer']): EngineDescriptor[] {
  return ENGINE_REGISTRY.filter(e => e.layer === layer);
}
