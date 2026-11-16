import raw from '@/data/typical-house.json';
import { hasTypical, typicalFor, type TypicalData } from '@/lib/typical';

/** The Census Survey of Construction tables, prepared by scripts/data-prep/typical_house.py. */
export const TYPICAL = raw as unknown as TypicalData;

/** Characteristics shown for a year (US-wide), for the report's section navigator; 0 = no section entry. */
export function typicalNavCount(year: number): number {
  return hasTypical(TYPICAL, year) ? (typicalFor(TYPICAL, year, 'US')?.chars.length ?? 0) : 0;
}
