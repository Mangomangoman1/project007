'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Issue } from '@/lib/types';
import { CATEGORIES } from '@/lib/labels';
import { appliesTo, inState } from '@/lib/select';
import { bandGeom, decades, packRows, pctMid, yearAt, type Domain } from '@/lib/timeline';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import styles from './Timeline.module.css';

/** The fields the timeline needs. IssueLite (src/lib/data.ts) satisfies this. */
export type TimelineIssue = Pick<Issue, 'id' | 'slug' | 'title' | 'category' | 'kind' | 'applies' | 'priority' | 'regions'>;

export type TimelineProps = {
  issues: TimelineIssue[];
  /** The selected build year: draws the year line and lights the bands it crosses. */
  year: number;
  /** Live updates while scrubbing (pointer drag, arrow keys). Omit for a static, non-interactive timeline. */
  onYearChange?: (year: number) => void;
  /** Fired on Enter, and on pointer release when `commitOnRelease`: "go to this year". */
  onCommit?: (year: number) => void;
  /** Also fire onCommit when a drag or tap ends (default true). */
  commitOnRelease?: boolean;
  /** When set, regional issues outside this state are drawn ghosted. */
  state?: string | null;
  /** compact = home/overview (thin bands); comfortable = taller bands and lane labels. */
  density?: 'compact' | 'comfortable';
  min?: number;
  max?: number;
  /** Accessible name of the slider. */
  label?: string;
  /** Extra text for aria-valuetext, e.g. "14 things apply". */
  describe?: (year: number) => string;
  className?: string;
};

const DIMS = {
  compact: { axis: 30, laneLabel: 17, band: 6, rowGap: 3, laneGap: 12, bottom: 6 },
  comfortable: { axis: 34, laneLabel: 20, band: 9, rowGap: 4, laneGap: 16, bottom: 8 },
} as const;

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };

/**
 * The signature element: every issue as a band across the build years it applies to, in lanes
 * by category. Sharp end-caps mark legal/recall dates; faded ends mark approximate eras; the
 * solid part is the core (most likely) years; hatched bands are protections a house LACKS.
 * A vertical line marks the selected year and the bands it crosses light up (red-oxide for
 * "check first"). Works with pointer, touch (horizontal drag; vertical scroll still scrolls)
 * and keyboard (arrows ±1, PageUp/PageDown ±10, Home/End, Enter commits).
 */
export function Timeline({
  issues,
  year,
  onYearChange,
  onCommit,
  commitOnRelease = true,
  state = null,
  density = 'compact',
  min = MIN_YEAR,
  max = MAX_YEAR,
  label = 'Build year',
  describe,
  className,
}: TimelineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const domain: Domain = useMemo(() => ({ min, max }), [min, max]);
  const dims = DIMS[density];
  const interactive = Boolean(onYearChange);
  const plotRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; active: boolean; touch: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 1000));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- static layout: lanes, rows, geometry (independent of the selected year) ---- */
  const layout = useMemo(() => {
    type Lane = { cat: (typeof CATEGORIES)[number]; top: number; height: number; bands: { issue: TimelineIssue; geom: ReturnType<typeof bandGeom>; y: number }[] };
    const lanes: Lane[] = [];
    let cursor = dims.axis;
    for (const cat of CATEGORIES) {
      const items = issues.filter((i) => i.category === cat.id);
      if (items.length === 0) continue;
      const { rows, rowOf } = packRows(items, domain);
      const top = cursor;
      const bandsTop = top + dims.laneLabel;
      const bands = items.map((issue) => ({
        issue,
        geom: bandGeom(issue, domain),
        y: bandsTop + rowOf.get(issue)! * (dims.band + dims.rowGap),
      }));
      const height = dims.laneLabel + rows * (dims.band + dims.rowGap) - dims.rowGap;
      cursor = top + height + dims.laneGap;
      lanes.push({ cat, top, height, bands });
    }
    return { lanes, height: cursor - dims.laneGap + dims.bottom };
  }, [issues, domain, dims]);

  const ticks = useMemo(() => decades(domain), [domain]);
  const litCount = useMemo(() => issues.filter((i) => appliesTo(i, year) && inState(i, state)).length, [issues, year, state]);

  /* ---- interaction ---- */
  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = plotRef.current;
      if (!el || !onYearChange) return year;
      const rect = el.getBoundingClientRect();
      const y = yearAt((clientX - rect.left) / rect.width, domain);
      if (y !== year) onYearChange(y);
      return y;
    },
    [onYearChange, domain, year],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const touch = e.pointerType !== 'mouse';
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, active: !touch, touch };
    if (!touch) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      setFromClientX(e.clientX);
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      // Touch: start scrubbing only once the gesture is clearly horizontal.
      const dx = Math.abs(e.clientX - d.x0);
      const dy = Math.abs(e.clientY - d.y0);
      if (dx > 6 && dx > dy) {
        d.active = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      } else return;
    }
    setFromClientX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (cancelled) return;
    // A touch tap (no horizontal drag) jumps to the tapped year.
    const y = d.active ? setFromClientX(e.clientX) : d.touch && Math.abs(e.clientY - d.y0) < 8 ? setFromClientX(e.clientX) : null;
    if (y !== null && onCommit && commitOnRelease) onCommit(y);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onYearChange) return;
    let next: number | null = null;
    if (e.key in KEY_STEP) next = year + KEY_STEP[e.key] * (e.shiftKey && Math.abs(KEY_STEP[e.key]) === 1 ? 10 : 1);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    else if (e.key === 'Enter' && onCommit) {
      e.preventDefault();
      onCommit(year);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    next = Math.min(max, Math.max(min, next));
    if (next !== year) onYearChange(next);
  };

  const linePct = pctMid(year, domain);
  // Hide decade labels the year tag would sit on top of (tag ~44px wide, label ~30px).
  const pxPerYear = width / (max + 1 - min);
  const tickCovered = (t: number) => Math.abs(t - (year + 0.5)) * pxPerYear < 42;
  const tagAlign = linePct < 6 ? 'start' : linePct > 94 ? 'end' : 'center';
  const valueText = `${year}${describe ? `: ${describe(year)}` : `: ${litCount} issues apply`}`;

  return (
    <div
      className={`${styles.timeline} ${styles[density]} ${interactive ? styles.interactive : ''} ${dragging ? styles.dragging : ''} ${className ?? ''}`}
    >
      <div
        ref={plotRef}
        className={styles.plot}
        style={{ height: layout.height }}
        {...(interactive
          ? {
              role: 'slider',
              tabIndex: 0,
              'aria-label': label,
              'aria-valuemin': min,
              'aria-valuemax': max,
              'aria-valuenow': year,
              'aria-valuetext': valueText,
              'aria-orientation': 'horizontal' as const,
              onKeyDown,
              onPointerDown,
              onPointerMove,
              onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, false),
              onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => endDrag(e, true),
            }
          : { role: 'img', 'aria-label': `Timeline of ${issues.length} issues from ${min} to ${max}; ${valueText}` })}
      >
        <svg className={styles.svg} width="100%" height={layout.height} aria-hidden="true" focusable="false">
          <defs>
            {(['dim', 'lit', 'accent', 'ghost'] as const).map((k) => (
              <pattern key={k} id={`${uid}-hatch-${k}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect className={styles[`hatch_${k}`]} width="1.6" height="4" />
              </pattern>
            ))}
            {layout.lanes.flatMap((lane) =>
              lane.bands.map(({ issue, geom }) => (
                <linearGradient key={`g-${issue.id}`} id={`${uid}-g-${issue.id}`}>
                  {geom.stops.map(([o, a], i) => (
                    <stop key={i} offset={o} stopColor="#fff" stopOpacity={a} />
                  ))}
                </linearGradient>
              )),
            )}
            {layout.lanes.flatMap((lane) =>
              lane.bands.map(({ issue }) => (
                <mask key={`m-${issue.id}`} id={`${uid}-m-${issue.id}`} maskContentUnits="objectBoundingBox">
                  <rect width="1" height="1" fill={`url(#${uid}-g-${issue.id})`} />
                </mask>
              )),
            )}
          </defs>

          {/* drafting grid: a fine line every decade, through all lanes */}
          <g className={styles.grid}>
            {ticks.map((t) => (
              <line key={t} x1={`${pctMid(t - 0.5, domain)}%`} x2={`${pctMid(t - 0.5, domain)}%`} y1={dims.axis - 6} y2={layout.height} className={t % 50 === 0 ? styles.gridMajor : undefined} />
            ))}
          </g>

          {/* axis: a dimension line with decade ticks */}
          <g className={styles.axis}>
            <line x1="0" x2="100%" y1={dims.axis - 6} y2={dims.axis - 6} />
            <line x1="0.5" x2="0.5" y1={dims.axis - 11} y2={dims.axis - 1} />
            <line x1="99.9%" x2="99.9%" y1={dims.axis - 11} y2={dims.axis - 1} />
            {ticks.map((t) => (
              <text
                key={t}
                x={`${pctMid(t - 0.5, domain)}%`}
                y={dims.axis - 12}
                className={`${styles.tick} ${t % 20 !== 0 ? styles.tickMinor : ''} ${tickCovered(t) ? styles.tickHidden : ''}`}
                textAnchor={t === ticks[0] && pctMid(t - 0.5, domain) < 2 ? 'start' : 'middle'}
              >
                {t}
              </text>
            ))}
          </g>

          {layout.lanes.map((lane) => {
            const lit = lane.bands.filter(({ issue }) => appliesTo(issue, year) && inState(issue, state)).length;
            return (
              <g key={lane.cat.id} className={styles.lane}>
                <text x="0" y={lane.top + 11} className={styles.laneLabel}>
                  {density === 'compact' ? lane.cat.label : lane.cat.label}
                </text>
                <text x="100%" y={lane.top + 11} className={`${styles.laneCount} ${lit ? styles.laneCountOn : ''}`} textAnchor="end">
                  {lit} of {lane.bands.length}
                </text>
                {lane.bands.map(({ issue, geom, y }, i) => {
                  const on = appliesTo(issue, year);
                  const ghost = !inState(issue, state);
                  const tone = ghost ? 'ghost' : on ? (issue.priority === 1 ? 'accent' : 'lit') : 'dim';
                  const cls = [styles.band, styles[`tone_${tone}`], issue.kind === 'missing' ? styles.missing : '', geom.coreX === null ? styles.noCore : ''].join(' ');
                  return (
                    <g key={issue.id} className={cls} style={{ '--i': i } as React.CSSProperties}>
                      <title>{`${issue.title} · ${geom.label}`}</title>
                      <g mask={`url(#${uid}-m-${issue.id})`}>
                        <rect
                          className={styles.body}
                          x={`${geom.x}%`}
                          width={`${geom.w}%`}
                          y={y}
                          height={dims.band}
                          style={issue.kind === 'missing' ? { fill: `url(#${uid}-hatch-${tone})` } : undefined}
                        />
                        {geom.coreX !== null && geom.coreW !== null && (
                          <rect
                            className={styles.core}
                            x={`${geom.coreX}%`}
                            width={`${geom.coreW}%`}
                            y={y}
                            height={dims.band}
                            style={issue.kind === 'missing' ? { fill: `url(#${uid}-hatch-${tone})` } : undefined}
                          />
                        )}
                      </g>
                      {geom.sharpStart && <line className={styles.cap} x1={`${geom.x}%`} x2={`${geom.x}%`} y1={y - 2.5} y2={y + dims.band + 2.5} />}
                      {geom.sharpEnd && (
                        <line className={styles.cap} x1={`${geom.x + geom.w}%`} x2={`${geom.x + geom.w}%`} y1={y - 2.5} y2={y + dims.band + 2.5} />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* the year line (HTML overlay so it can ease smoothly in % units) */}
        <div className={styles.yearLine} style={{ left: `${linePct}%`, top: dims.axis - 6 }} aria-hidden="true">
          <span className={`${styles.yearTag} ${styles[`align_${tagAlign}`]}`}>{year}</span>
        </div>
      </div>
    </div>
  );
}
