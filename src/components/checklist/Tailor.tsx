'use client';

import type { HouseCutawayProps } from '@/components/HouseCutaway/HouseCutaway';
import { HouseCutaway } from '@/components/HouseCutaway/HouseCutaway';
import { hiddenReason, matchesProfile, type When } from '@/lib/profile';
import { plural } from '@/lib/labels';
import type { Zone } from '@/lib/types';
import { useHouseProfile } from '../profile/useHouseProfile';

/**
 * The printable checklist is a static server page. These small client islands make it honour the
 * visitor's "About your house" answers after hydration: rows the answers rule out are hidden by
 * an injected stylesheet (`[data-item]`), counts and the diagram are recomputed, and a note says
 * the sheet is tailored. Server HTML (and no-JS) is the full, untailored sheet.
 */
export type TailorItem = { slug: string; when?: When; part?: string; zone?: Zone };

/** Hides ruled-out rows (and parts left empty) and says so, on screen and on paper. */
export function ChecklistTailor({ items, className }: { items: TailorItem[]; className?: string }) {
  const [profile] = useHouseProfile();
  const out = items.filter((i) => !matchesProfile(i, profile));
  if (out.length === 0) return null;
  const outSlugs = new Set(out.map((i) => i.slug));
  const parts = new Map<string, boolean>();
  for (const i of items) if (i.part) parts.set(i.part, (parts.get(i.part) ?? false) || !outSlugs.has(i.slug));
  const emptyParts = [...parts].filter(([, any]) => !any).map(([p]) => p);
  const css = [
    ...[...outSlugs].map((s) => `[data-item="${s}"]`),
    ...emptyParts.map((p) => `[data-part="${p}"]`),
  ].join(',');
  const reasons = [...new Set(out.map((i) => hiddenReason(i, profile)).filter(Boolean))];
  return (
    <>
      <style>{`${css}{display:none!important}`}</style>
      <span className={className} role="note">
        <strong>Tailored to your answers:</strong> {plural(out.length, 'item')} left out ({reasons.join('; ')})
      </span>
    </>
  );
}

/** A count that drops the items the visitor's answers rule out. */
export function TailoredCount({ items }: { items: Pick<TailorItem, 'when'>[] }) {
  const [profile] = useHouseProfile();
  return <>{items.filter((i) => matchesProfile(i, profile)).length}</>;
}

/** The "where to look" diagram, counting only the items that apply. */
export function TailoredCutaway({ items, ...rest }: { items: TailorItem[] } & Omit<HouseCutawayProps, 'counts'>) {
  const [profile] = useHouseProfile();
  const counts: Partial<Record<Zone, number>> = {};
  for (const i of items) if (i.zone && matchesProfile(i, profile)) counts[i.zone] = (counts[i.zone] ?? 0) + 1;
  return <HouseCutaway {...rest} counts={counts} />;
}
