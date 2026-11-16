/**
 * The house profile ("About your house"): optional answers that make a year's report specific to
 * one house. This file is the single source of truth for the attributes, their values, the
 * question and chip wording, and the matching rule. It is plain, import-free TypeScript using only
 * erasable syntax, so scripts/build-data.mjs imports it directly (Node strips the types) to
 * validate `when` conditions in the content files.
 *
 * Rule (docs/SPEC.md, v1.1): an item applies to a profile when, for every attribute listed in its
 * `when`, the profile's answer is unset OR one of the listed values. No `when` = always applies.
 * Unanswered questions never hide anything.
 */

export type ProfileValue = {
  /** Stored value, e.g. 'crawlspace'. */
  id: string;
  /** Chip text, e.g. 'Crawl space'. */
  label: string;
  /** Phrase used in "Hidden because: …" and in the answers summary, e.g. 'crawl space foundation'. */
  fact: string;
};

export type ProfileQuestion = {
  key: ProfileKey;
  /** Short question, e.g. "What's under it?" */
  question: string;
  /** Short attribute name for summaries and the "not sure" chip's label, e.g. 'Foundation'. */
  name: string;
  /** Optional one-line clarification under the question. */
  hint?: string;
  values: readonly ProfileValue[];
};

export const PROFILE_KEYS = [
  'type', 'stories', 'foundation', 'exterior', 'roof',
  'heating', 'cooling', 'chimney',
  'gas', 'water', 'sewer',
] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

/** Every question, in display order. Values must match the HouseProfile type below. */
export const PROFILE_QUESTIONS: readonly ProfileQuestion[] = [
  {
    key: 'type', name: 'Type', question: 'How was it built?',
    values: [
      { id: 'site-built', label: 'On site', fact: 'built on site' },
      { id: 'manufactured', label: 'Manufactured / mobile', fact: 'a manufactured home' },
    ],
  },
  {
    key: 'stories', name: 'Floors', question: 'How many floors?',
    values: [
      { id: 'one', label: 'One', fact: 'one floor' },
      { id: 'two-plus', label: 'Two or more', fact: 'two or more floors' },
    ],
  },
  {
    key: 'foundation', name: 'Foundation', question: 'What is under it?',
    values: [
      { id: 'basement', label: 'Basement', fact: 'a basement' },
      { id: 'crawlspace', label: 'Crawl space', fact: 'a crawl space' },
      { id: 'slab', label: 'Slab', fact: 'a slab foundation' },
    ],
  },
  {
    key: 'exterior', name: 'Walls', question: 'Outside walls',
    values: [
      { id: 'wood', label: 'Wood', fact: 'wood siding' },
      { id: 'vinyl-aluminum', label: 'Vinyl / aluminum', fact: 'vinyl or aluminum siding' },
      { id: 'brick-stone', label: 'Brick / stone', fact: 'brick or stone walls' },
      { id: 'stucco', label: 'Stucco', fact: 'stucco walls' },
      { id: 'fiber-cement', label: 'Fiber cement', fact: 'fiber cement siding' },
    ],
  },
  {
    key: 'roof', name: 'Roof', question: 'Roof covering',
    values: [
      { id: 'asphalt', label: 'Asphalt shingle', fact: 'an asphalt shingle roof' },
      { id: 'wood', label: 'Wood shake', fact: 'a wood shake roof' },
      { id: 'tile', label: 'Tile', fact: 'a tile roof' },
      { id: 'metal', label: 'Metal', fact: 'a metal roof' },
      { id: 'flat', label: 'Flat', fact: 'a flat roof' },
    ],
  },
  {
    key: 'heating', name: 'Heat', question: 'Main heat',
    values: [
      { id: 'forced-air', label: 'Furnace & ducts', fact: 'furnace heat' },
      { id: 'boiler', label: 'Boiler & radiators', fact: 'boiler heat' },
      { id: 'electric-resistance', label: 'Electric baseboard', fact: 'electric baseboard heat' },
      { id: 'heat-pump', label: 'Heat pump', fact: 'a heat pump' },
    ],
  },
  {
    key: 'cooling', name: 'Cooling', question: 'Central air?',
    values: [
      { id: 'central', label: 'Yes', fact: 'central air' },
      { id: 'none', label: 'No', fact: 'no central air' },
    ],
  },
  {
    key: 'chimney', name: 'Chimney', question: 'Masonry chimney or fireplace?',
    values: [
      { id: 'yes', label: 'Yes', fact: 'a chimney' },
      { id: 'no', label: 'No', fact: 'no chimney' },
    ],
  },
  {
    key: 'gas', name: 'Gas', question: 'Any gas or propane?', hint: 'Furnace, water heater, stove, dryer or fireplace',
    values: [
      { id: 'yes', label: 'Yes', fact: 'gas' },
      { id: 'no', label: 'No', fact: 'no gas' },
    ],
  },
  {
    key: 'water', name: 'Water', question: 'Water comes from',
    values: [
      { id: 'city', label: 'City / utility', fact: 'city water' },
      { id: 'well', label: 'A well', fact: 'a private well' },
    ],
  },
  {
    key: 'sewer', name: 'Sewer', question: 'Drains go to',
    values: [
      { id: 'city', label: 'City sewer', fact: 'city sewer' },
      { id: 'septic', label: 'Septic', fact: 'a septic system' },
    ],
  },
];

/** Questions in three groups, so eleven of them read as a short spec sheet rather than a form. */
export const PROFILE_GROUPS: readonly { id: string; label: string; keys: readonly ProfileKey[] }[] = [
  { id: 'building', label: 'The building', keys: ['type', 'stories', 'foundation', 'exterior', 'roof'] },
  { id: 'systems', label: 'Its systems', keys: ['heating', 'cooling', 'chimney'] },
  { id: 'services', label: 'Its services', keys: ['gas', 'water', 'sewer'] },
];

export type HouseProfile = Partial<{
  type: 'site-built' | 'manufactured';
  foundation: 'basement' | 'crawlspace' | 'slab';
  stories: 'one' | 'two-plus';
  exterior: 'wood' | 'vinyl-aluminum' | 'brick-stone' | 'stucco' | 'fiber-cement';
  roof: 'asphalt' | 'wood' | 'tile' | 'metal' | 'flat';
  heating: 'forced-air' | 'boiler' | 'electric-resistance' | 'heat-pump';
  cooling: 'central' | 'none';
  gas: 'yes' | 'no';
  water: 'city' | 'well';
  sewer: 'city' | 'septic';
  chimney: 'yes' | 'no';
}>;

/** Conditions on an issue or lifespan: the answers under which it can apply. */
export type When = Partial<Record<keyof HouseProfile, string[]>>;

const QUESTION_BY_KEY = new Map(PROFILE_QUESTIONS.map((q) => [q.key, q]));
export const questionFor = (key: ProfileKey): ProfileQuestion => QUESTION_BY_KEY.get(key)!;

const isKey = (k: string): k is ProfileKey => QUESTION_BY_KEY.has(k as ProfileKey);
const isValue = (k: ProfileKey, v: unknown): boolean => typeof v === 'string' && questionFor(k).values.some((x) => x.id === v);

/** Keep only known attributes with known values (stored data may be stale or tampered with). */
export function sanitizeProfile(raw: unknown): HouseProfile {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isKey(k) && isValue(k, v)) out[k] = v as string;
  }
  return out as HouseProfile;
}

/** Number of questions answered. */
export const answeredCount = (profile: HouseProfile | null | undefined): number =>
  profile ? PROFILE_KEYS.filter((k) => profile[k] !== undefined).length : 0;

/** The attributes whose answer rules the item out (empty when it applies). */
export function profileConflicts(item: { when?: When }, profile: HouseProfile | null | undefined): ProfileKey[] {
  if (!item.when || !profile) return [];
  const out: ProfileKey[] = [];
  for (const k of PROFILE_KEYS) {
    const allowed = item.when[k];
    const answer = profile[k];
    if (!allowed || answer === undefined) continue;
    if (!allowed.includes(answer)) out.push(k);
  }
  return out;
}

/** Does the item apply to a house with these answers? */
export const matchesProfile = (item: { when?: When }, profile: HouseProfile | null | undefined): boolean =>
  profileConflicts(item, profile).length === 0;

/** The phrase for one answer, e.g. factFor('gas', 'no') = 'no gas'. */
export function factFor(key: ProfileKey, value: string | undefined): string {
  return questionFor(key).values.find((v) => v.id === value)?.fact ?? '';
}

/** "no gas", "a slab foundation and no chimney": why an item is hidden, or null if it applies. */
export function hiddenReason(item: { when?: When }, profile: HouseProfile | null | undefined): string | null {
  const keys = profileConflicts(item, profile);
  if (keys.length === 0 || !profile) return null;
  const facts = keys.map((k) => factFor(k, profile[k]));
  return facts.length < 2 ? facts[0] : `${facts.slice(0, -1).join(', ')} and ${facts[facts.length - 1]}`;
}

/** Split items into those that apply to the profile and those its answers rule out (order kept). */
export function splitByProfile<T extends { when?: When }>(items: T[], profile: HouseProfile | null | undefined): { shown: T[]; hidden: T[] } {
  const shown: T[] = [];
  const hidden: T[] = [];
  for (const i of items) (matchesProfile(i, profile) ? shown : hidden).push(i);
  return { shown, hidden };
}

/** Set or clear (value undefined) one answer, returning a new profile. */
export function setAnswer(profile: HouseProfile, key: ProfileKey, value: string | undefined): HouseProfile {
  const next: Record<string, string> = { ...(profile as Record<string, string>) };
  if (value === undefined || !isValue(key, value)) delete next[key];
  else next[key] = value;
  return next as HouseProfile;
}

/**
 * Validate a `when` from content. Returns a list of problems (empty = valid): unknown attribute,
 * unknown value, empty or non-array value lists, or a condition listing every value (a no-op).
 */
export function validateWhen(when: unknown): string[] {
  if (when === undefined) return [];
  if (!when || typeof when !== 'object' || Array.isArray(when)) return ['"when" must be an object of attribute: [values]'];
  const problems: string[] = [];
  const entries = Object.entries(when as Record<string, unknown>);
  if (entries.length === 0) problems.push('"when" is empty (leave it out instead)');
  for (const [k, vals] of entries) {
    if (!isKey(k)) {
      problems.push(`unknown attribute "${k}" in "when" (expected one of ${PROFILE_KEYS.join('|')})`);
      continue;
    }
    if (!Array.isArray(vals) || vals.length === 0) {
      problems.push(`when.${k} must be a non-empty array of values`);
      continue;
    }
    const known = questionFor(k).values.map((v) => v.id);
    for (const v of vals) {
      if (!known.includes(v as string)) problems.push(`unknown value ${JSON.stringify(v)} for when.${k} (expected one of ${known.join('|')})`);
    }
    if (new Set(vals).size !== vals.length) problems.push(`when.${k} lists a value twice`);
    if (known.every((v) => vals.includes(v))) problems.push(`when.${k} lists every value, so it never hides anything (leave it out)`);
  }
  return problems;
}
