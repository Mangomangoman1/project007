/**
 * US Census regions (the four the Survey of Construction reports) and which states sit in each.
 * Pure and import-free so Node can run its tests directly.
 * Source: US Census Bureau, "Census Regions and Divisions of the United States".
 */

export type RegionId = 'NE' | 'MW' | 'S' | 'W';
/** A region, or the whole country. */
export type GeoId = 'US' | RegionId;

export const REGIONS: readonly { id: RegionId; label: string; states: readonly string[] }[] = [
  { id: 'NE', label: 'Northeast', states: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'] },
  {
    id: 'MW',
    label: 'Midwest',
    states: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  },
  {
    id: 'S',
    label: 'South',
    states: ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'],
  },
  { id: 'W', label: 'West', states: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'] },
];

export const GEO_IDS: readonly GeoId[] = ['US', 'NE', 'MW', 'S', 'W'];

export const GEO_LABEL: Record<GeoId, string> = {
  US: 'United States',
  NE: 'Northeast',
  MW: 'Midwest',
  S: 'South',
  W: 'West',
};

const BY_STATE: Record<string, RegionId> = Object.fromEntries(
  REGIONS.flatMap((r) => r.states.map((s) => [s, r.id])),
);

/** The Census region of a USPS state code ("TX" → "S"), or null for none/unknown. */
export function regionOfState(code: string | null | undefined): RegionId | null {
  if (!code) return null;
  return BY_STATE[code.toUpperCase()] ?? null;
}

export const isGeoId = (v: unknown): v is GeoId => typeof v === 'string' && (GEO_IDS as readonly string[]).includes(v);

/** "in the South" / "across the US". */
export const geoPhrase = (geo: GeoId) => (geo === 'US' ? 'across the US' : `in the ${GEO_LABEL[geo]}`);
