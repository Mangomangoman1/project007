/** Data contract — mirrors docs/SPEC.md. Produced by scripts/build-data.mjs. */
import type { When } from './profile';

export type { HouseProfile, When } from './profile';

export type Zone =
  | 'roof' | 'attic' | 'exterior-walls' | 'windows' | 'electrical-panel' | 'wiring-outlets'
  | 'kitchen' | 'bathroom' | 'plumbing-supply' | 'drains-sewer' | 'water-heater' | 'heating-cooling'
  | 'basement-foundation' | 'garage' | 'deck-yard' | 'interior-surfaces' | 'chimney' | 'whole-house';

export type Category = 'electrical' | 'plumbing' | 'hazmat' | 'envelope' | 'structure' | 'hvac' | 'fire-safety';
export type Severity = 'safety' | 'money' | 'comfort';
export type Evidence = 'record' | 'rule' | 'era';
export type PrevalenceLabel = 'likely' | 'possible' | 'rare' | 'unknown';
export type Tier = 'primary' | 'trade' | 'reference';
export type Edge = 'sharp' | 'soft';

export type Source = { url: string; publisher: string; tier: Tier; quote?: string };

export type Applies = {
  from: number | null;
  to: number | null;
  coreFrom: number | null;
  coreTo: number | null;
  startEdge: Edge;
  endEdge: Edge;
};

export type Issue = {
  id: string;
  slug: string;
  title: string;
  category: Category;
  hook: string;
  summary: string;
  kind: 'present' | 'missing';
  applies: Applies;
  regions: 'national' | string[];
  severity: Severity;
  priority: 1 | 2 | 3;
  evidence: Evidence;
  prevalence: { label: PrevalenceLabel; note: string };
  retrofit: boolean;
  where: Zone[];
  check: string[];
  action: string;
  caveat?: string;
  /** House-profile conditions (v1.1): the answers under which this issue can apply. */
  when?: When;
  sources: Source[];
};

export type Lifespan = {
  id: string;
  title: string;
  zone: Zone;
  lifeLow: number;
  lifeHigh: number;
  /** True when the source gives an open-ended life ("100+"): never shown as worn out by age alone. */
  openEnded?: boolean;
  note: string;
  /** House-profile conditions (v1.1), e.g. { sewer: ['septic'] }. */
  when?: When;
  sources: Source[];
};

export type DataMeta = {
  sample: boolean;
  editorialFile: string;
  lifespansFile: string;
  researchFiles: string[];
  issueCount: number;
  excludedCount: number;
  lifespanCount: number;
  /** Issues / lifespans that carry house-profile conditions (`when`). */
  conditionalIssueCount?: number;
  conditionalLifespanCount?: number;
  sourceCount: number;
  primarySourceCount: number;
};
