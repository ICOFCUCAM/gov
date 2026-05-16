// Shared AI advisory — federation AI integration.
//
// Every sovereign application gets AI-assisted operational advisories.
// Deterministic and explainable (no opaque generation): advisories are
// derived from the application's live operational signals so they are
// reproducible and auditable. Pure; no React/DOM.

export interface AdvisorySignal { label: string; value: number; /** higher = worse */ adverse: boolean }
export interface Advisory {
  severity: 'routine' | 'advisory' | 'priority' | 'critical';
  headline: string;
  rationale: string;
  recommended: string[];
  confidence: number; // 0-100
}

export function aiAdvisory(appLabel: string, signals: AdvisorySignal[]): Advisory {
  const adverse = signals.filter(s => s.adverse && s.value >= 65);
  const watch = signals.filter(s => s.adverse && s.value >= 45 && s.value < 65);
  const worst = [...signals].filter(s => s.adverse).sort((a, b) => b.value - a.value)[0];

  const severity: Advisory['severity'] =
    adverse.length >= 2 ? 'critical'
      : adverse.length === 1 ? 'priority'
        : watch.length ? 'advisory' : 'routine';

  const headline =
    severity === 'critical' ? `${appLabel}: multiple operational systems degraded — coordinated intervention advised`
      : severity === 'priority' ? `${appLabel}: ${worst?.label ?? 'a system'} degraded — targeted intervention advised`
        : severity === 'advisory' ? `${appLabel}: early-warning indicators elevated`
          : `${appLabel}: operating within tolerance`;

  const recommended: string[] = [];
  if (adverse.length) {
    recommended.push(`Prioritise ${adverse.map(s => s.label).slice(0, 3).join(', ')}`);
    recommended.push('Escalate to sector command cell · pre-position reserves');
  }
  if (watch.length) recommended.push(`Monitor ${watch.map(s => s.label).slice(0, 3).join(', ')} on shortened cadence`);
  if (!recommended.length) recommended.push('Sustain monitoring tempo · no action required');

  const confidence = Math.round(72 + Math.min(24, signals.length * 3) - adverse.length * 2);

  return {
    severity,
    headline,
    rationale: worst
      ? `Lead indicator: ${worst.label} at ${worst.value}. ${adverse.length} adverse / ${watch.length} watch across ${signals.length} signals.`
      : `${signals.length} signals nominal.`,
    recommended,
    confidence: Math.max(40, Math.min(99, confidence)),
  };
}
