// Types for admin2-convert.mjs (shared with scripts/build-map-pack.mjs).
import type { Geom } from './admin1';

export interface GbMeta {
  boundaryID?: string;
  boundaryISO?: string;
  boundaryType?: string;
  boundarySource?: string;
  boundaryLicense?: string;
  licenseDetail?: string;
  licenseSource?: string;
  boundarySourceURL?: string;
  boundaryYearRepresented?: string | number;
  boundaryYear?: string | number;
  admUnitCount?: string | number;
  gjDownloadURL?: string;
  simplifiedGeometryGeoJSON?: string;
  [k: string]: unknown;
}
export interface ConvertedUnit { code: string; name: string; parent?: string; lng: number; lat: number; geometry: Geom }
export type Point = [number, number];

export const OPEN: RegExp;
export function licenceRefusal(meta: GbMeta | null | undefined): string | null;
export function levelsBelow(firstAdm?: string): string[];
export function finerThan(units: number, top: number): boolean;
export function slug(s: unknown): string;
export function featureOf(geometry: Geom): { type: 'Feature'; properties: Record<string, never>; geometry: Geom };
export function rewind<G extends { type: string; coordinates: unknown }>(g: G): G;
export function roundGeometry(g: { type: string; coordinates?: unknown } | null | undefined, digits?: number): Geom | null;
export function parentFinder(provinces: readonly { code: string; geometry?: Geom }[]): (pt: Point) => string | undefined;
export function vertices(g: Geom, max?: number): Point[];
export function interior(g: Geom, f?: unknown, n?: number): Point[];
export function labelPoint(g: Geom): Point;
export function assignUnits(
  items: readonly { geometry: Geom; name: unknown; iso: unknown; label: Point }[],
  findParent: (pt: Point) => string | undefined,
  iso3: string,
  labelDigits?: number,
): { units: ConvertedUnit[]; viaVote: number; crossing: string[] };
