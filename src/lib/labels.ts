import type { Category, Evidence, PrevalenceLabel, Severity, Tier, Zone } from './types';

/** Category lanes, in the order the timeline draws them. */
export const CATEGORIES: { id: Category; label: string; short: string }[] = [
  { id: 'electrical', label: 'Electrical', short: 'Elec' },
  { id: 'plumbing', label: 'Plumbing', short: 'Plumb' },
  { id: 'hazmat', label: 'Hazardous materials', short: 'Hazmat' },
  { id: 'envelope', label: 'Roof, walls & windows', short: 'Envelope' },
  { id: 'structure', label: 'Structure', short: 'Struct' },
  { id: 'hvac', label: 'Heating & cooling', short: 'HVAC' },
  { id: 'fire-safety', label: 'Fire & life safety', short: 'Safety' },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<Category, string>;

/** Evidence stamps. `short` is the stamp text; `long` explains it (tooltip, About page). */
export const EVIDENCE: Record<Evidence, { short: string; long: string }> = {
  record: { short: 'Court record', long: 'Dates come from a court settlement or a product recall.' },
  rule: { short: 'Federal rule', long: 'Dates come from a federal rule or a model building code.' },
  era: { short: 'Approximate era', long: 'Dates are an approximate era drawn from trade and reference sources.' },
};

export const PREVALENCE: Record<PrevalenceLabel, string> = {
  likely: 'Likely',
  possible: 'Possible',
  rare: 'Rare',
  unknown: 'No reliable count exists',
};

export const SEVERITY: Record<Severity, string> = {
  safety: 'Safety',
  money: 'Cost',
  comfort: 'Comfort',
};

export const TIER: Record<Tier, string> = {
  primary: 'Primary source',
  trade: 'Trade reference',
  reference: 'Reference',
};

export const ZONE_LABEL: Record<Zone, string> = {
  roof: 'Roof',
  attic: 'Attic',
  'exterior-walls': 'Exterior walls',
  windows: 'Windows',
  'electrical-panel': 'Electrical panel',
  'wiring-outlets': 'Wiring & outlets',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  'plumbing-supply': 'Water pipes',
  'drains-sewer': 'Drains & sewer',
  'water-heater': 'Water heater',
  'heating-cooling': 'Heating & cooling',
  'basement-foundation': 'Basement & foundation',
  garage: 'Garage',
  'deck-yard': 'Deck & yard',
  'interior-surfaces': 'Walls, ceilings & floors',
  chimney: 'Chimney',
  'whole-house': 'Whole house',
};

/** "Parts of the house" used to group the report. Every Zone maps to exactly one part. */
export const PARTS: { id: string; label: string; zones: Zone[] }[] = [
  { id: 'electrical', label: 'Electrical', zones: ['electrical-panel', 'wiring-outlets'] },
  { id: 'plumbing', label: 'Plumbing & water', zones: ['plumbing-supply', 'drains-sewer', 'water-heater'] },
  { id: 'kitchen-bath', label: 'Kitchen & bath', zones: ['kitchen', 'bathroom'] },
  { id: 'interior', label: 'Inside the walls & rooms', zones: ['interior-surfaces'] },
  { id: 'heating', label: 'Heating, cooling & chimney', zones: ['heating-cooling', 'chimney'] },
  { id: 'top', label: 'Roof & attic', zones: ['roof', 'attic'] },
  { id: 'outside', label: 'Exterior walls & windows', zones: ['exterior-walls', 'windows'] },
  { id: 'below', label: 'Foundation & basement', zones: ['basement-foundation'] },
  { id: 'around', label: 'Garage, deck & yard', zones: ['garage', 'deck-yard'] },
  { id: 'whole', label: 'Whole house', zones: ['whole-house'] },
];
export const PART_OF_ZONE = Object.fromEntries(PARTS.flatMap((p) => p.zones.map((z) => [z, p.id]))) as Record<Zone, string>;

export const STATES: { code: string; name: string }[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }));
export const STATE_NAME = Object.fromEntries(STATES.map((s) => [s.code, s.name])) as Record<string, string>;

/** "1 thing" / "14 things". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
