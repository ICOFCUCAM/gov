'use client';

// Reusable inline SVG illustrations for public ministry hero blocks.
// Each illustration is deterministic, accessible, and gradient-driven —
// no external imagery. Themed by the ministry palette.

import * as React from 'react';

export function HeroGradient({ a, b, aria }: { a: string; b: string; aria: string }) {
  return (
    <div className="h-full w-full rounded-2xl shadow-xl" role="img" aria-label={aria}
      style={{ background: `linear-gradient(135deg, ${a}, ${b} 70%)`, boxShadow: `0 20px 50px rgba(0,0,0,0.22)` }} />
  );
}

export function HeroIllustration({ kind, primary, accent, aria }: {
  kind: 'shield' | 'scales' | 'leaf' | 'wheat' | 'bolt' | 'wheel' | 'globe' | 'siren'
      | 'wave' | 'wallet' | 'lecture' | 'gavel' | 'parliament' | 'tower' | 'satellite' | 'compass';
  primary: string; accent: string; aria: string;
}) {
  const common = { width: '100%', height: '100%' } as React.SVGAttributes<SVGSVGElement>;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-xl" role="img" aria-label={aria}
      style={{ background: `linear-gradient(135deg, ${primary}22, ${accent} 75%)` }}>
      <svg {...common} viewBox="0 0 320 280" preserveAspectRatio="xMidYMid slice">
        {kind === 'shield' ? (
          <g>
            <path d="M160 30 L260 70 V160 Q260 230 160 260 Q60 230 60 160 V70 Z" fill={primary} opacity="0.85" />
            <path d="M160 60 L230 90 V160 Q230 210 160 230 Q90 210 90 160 V90 Z" fill="#fff" opacity="0.15" />
            <text x="160" y="170" textAnchor="middle" fontFamily="Georgia, serif" fontSize="56" fill="#fff" opacity="0.92">⚖</text>
          </g>
        ) : kind === 'scales' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            <line x1="160" y1="50" x2="160" y2="220" />
            <line x1="60" y1="100" x2="260" y2="100" />
            <path d="M60 100 L40 160 L80 160 Z" fill={primary} opacity="0.7" />
            <path d="M260 100 L240 160 L280 160 Z" fill={primary} opacity="0.7" />
            <circle cx="160" cy="50" r="8" fill={primary} />
          </g>
        ) : kind === 'leaf' ? (
          <g>
            <path d="M70 220 Q90 80 250 70 Q230 200 70 220 Z" fill={primary} opacity="0.85" />
            <path d="M70 220 Q170 130 250 70" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
          </g>
        ) : kind === 'wheat' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            <line x1="160" y1="40" x2="160" y2="240" />
            {Array.from({ length: 6 }, (_, i) => (
              <g key={i}>
                <ellipse cx={120 - i * 4} cy={80 + i * 28} rx="14" ry="6" fill={primary} opacity="0.85" />
                <ellipse cx={200 + i * 4} cy={80 + i * 28} rx="14" ry="6" fill={primary} opacity="0.85" />
              </g>
            ))}
          </g>
        ) : kind === 'bolt' ? (
          <g>
            <path d="M170 30 L80 160 H140 L120 250 L240 100 H180 Z" fill={primary} stroke={accent} strokeWidth="3" />
          </g>
        ) : kind === 'wheel' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            <circle cx="160" cy="140" r="80" fill="#fff" opacity="0.1" />
            <circle cx="160" cy="140" r="80" />
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return <line key={i} x1="160" y1="140" x2={160 + Math.cos(a) * 80} y2={140 + Math.sin(a) * 80} />;
            })}
          </g>
        ) : kind === 'globe' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            <circle cx="160" cy="140" r="90" fill={primary} opacity="0.2" />
            <ellipse cx="160" cy="140" rx="90" ry="34" />
            <ellipse cx="160" cy="140" rx="34" ry="90" />
            <line x1="70" y1="140" x2="250" y2="140" />
            <line x1="160" y1="50" x2="160" y2="230" />
          </g>
        ) : kind === 'siren' ? (
          <g>
            <circle cx="160" cy="160" r="60" fill={primary} opacity="0.85" />
            <rect x="100" y="160" width="120" height="60" fill={primary} opacity="0.6" />
            <circle cx="160" cy="100" r="10" fill="#fff" />
            <path d="M120 90 Q160 60 200 90" stroke="#fff" strokeWidth="3" fill="none" />
          </g>
        ) : kind === 'wave' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            {Array.from({ length: 4 }, (_, i) => (
              <path key={i} d={`M20 ${120 + i * 24} Q80 ${100 + i * 24} 160 ${120 + i * 24} T 300 ${120 + i * 24}`}
                opacity={0.9 - i * 0.18} />
            ))}
          </g>
        ) : kind === 'wallet' ? (
          <g>
            <rect x="60" y="100" width="200" height="120" rx="10" fill={primary} opacity="0.85" />
            <rect x="200" y="140" width="60" height="30" fill="#fff" opacity="0.4" />
            <circle cx="230" cy="155" r="6" fill={accent} />
          </g>
        ) : kind === 'lecture' ? (
          <g>
            <rect x="60" y="200" width="200" height="20" fill={primary} opacity="0.7" />
            <polygon points="160,80 60,170 260,170" fill={primary} opacity="0.85" />
            <rect x="155" y="60" width="10" height="30" fill={accent} />
            <circle cx="160" cy="55" r="6" fill={accent} />
          </g>
        ) : kind === 'gavel' ? (
          <g stroke={primary} strokeWidth="4" fill="none">
            <rect x="80" y="120" width="80" height="40" fill={primary} opacity="0.85" stroke="none" />
            <line x1="120" y1="80" x2="220" y2="180" />
            <rect x="200" y="180" width="60" height="30" fill={primary} opacity="0.6" stroke="none" />
          </g>
        ) : kind === 'parliament' ? (
          <g>
            <rect x="40" y="200" width="240" height="40" fill={primary} opacity="0.7" />
            <polygon points="160,60 280,140 40,140" fill={primary} opacity="0.85" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x={60 + i * 30} y="140" width="14" height="60" fill="#fff" opacity="0.6" />
            ))}
          </g>
        ) : kind === 'tower' ? (
          <g>
            <rect x="120" y="80" width="80" height="160" fill={primary} opacity="0.85" />
            <polygon points="120,80 160,30 200,80" fill={accent} />
            {Array.from({ length: 6 }, (_, i) => (
              <rect key={i} x={130 + (i % 2) * 30} y={100 + Math.floor(i / 2) * 36} width="20" height="20" fill="#fff" opacity="0.5" />
            ))}
          </g>
        ) : kind === 'satellite' ? (
          <g stroke={primary} strokeWidth="3" fill="none">
            <circle cx="160" cy="140" r="20" fill={primary} opacity="0.85" />
            <rect x="80" y="135" width="60" height="10" fill={primary} opacity="0.7" />
            <rect x="180" y="135" width="60" height="10" fill={primary} opacity="0.7" />
            <path d="M160 100 Q100 80 70 130" />
            <path d="M160 100 Q220 80 250 130" />
          </g>
        ) : (
          // compass
          <g stroke={primary} strokeWidth="3" fill="none">
            <circle cx="160" cy="140" r="80" fill="#fff" opacity="0.1" />
            <circle cx="160" cy="140" r="80" />
            <polygon points="160,80 175,140 160,200 145,140" fill={primary} opacity="0.85" />
          </g>
        )}
      </svg>
    </div>
  );
}
