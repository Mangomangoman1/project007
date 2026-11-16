import type { Zone } from '@/lib/types';

export type HouseCutawayProps = {
  /** Zones to highlight ("look here"). */
  zones?: Zone[];
  /** Optional count per zone, drawn as a numbered dot (used on the report overview). */
  counts?: Partial<Record<Zone, number>>;
  /** 'sm' = inline thumbnail (~160px wide), 'md' = beside text (~360px), 'lg' = full width. */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible description; defaults to a sentence listing the highlighted zones. */
  label?: string;
  className?: string;
};

/**
 * STUB. The real drawing (a line-drawn cross-section of a house with addressable zones) is being
 * built by another agent, who will replace this file and keep exactly this props contract.
 * Server-safe: no hooks, no client-only APIs.
 */
export function HouseCutaway({ zones = [], size = 'md', label, className }: HouseCutawayProps) {
  return (
    <figure className={className} data-size={size} aria-label={label ?? `Where to look: ${zones.join(', ')}`} />
  );
}

export default HouseCutaway;
