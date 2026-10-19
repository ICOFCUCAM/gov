// A test-only page for the national-scale map renderer (architecture review
// G4; scripts/check-map-webgl.mjs): the nation's map with synthetic points
// (?n=, default 100,000, at most 250,000) and outlines (?areas=, default
// 3,000), drawn with WebGL and picked on the GPU. It exists only while the
// server runs with CIVICOS_MAP_CHECK=1 (a test server); everywhere else it
// answers 404. Like every console page it needs a signed-in session.
import { notFound } from 'next/navigation';
import { MapRenderCheck } from '@/components/map/MapRenderCheck';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Map renderer check' };

const num = (v: string | string[] | undefined, fallback: number, max: number) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.floor(n)) : fallback;
};

export default async function MapCheckPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const searchParams = await props.searchParams;
  if (process.env.CIVICOS_MAP_CHECK !== '1') notFound();
  const style = searchParams.style === 'tile' ? 'tile' : 'dot';
  const webglAbove = searchParams.webglAbove !== undefined ? num(searchParams.webglAbove, 20_000, 1_000_000) : undefined;
  return <MapRenderCheck n={num(searchParams.n, 100_000, 250_000)} areas={num(searchParams.areas, 3000, 50_000)} style={style} webglAbove={webglAbove} />;
}
