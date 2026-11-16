'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Issue } from '@/lib/types';
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/labels';
import { appliesTo, bandRange, inState, sortIssues } from '@/lib/select';
import {
  bandGeom,
  coreLabel,
  decades,
  packLane,
  pctMid,
  pickBand,
  placeNote,
  tickLabels,
  yearAt,
  type Domain,
  type HitCandidate,
} from '@/lib/timeline';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { hiddenReason, matchesProfile, type HouseProfile } from '@/lib/profile';
import { CheckFirstTag, EvidenceStamp } from './Stamps';
import styles from './Timeline.module.css';

/** The fields the timeline needs. IssueLite (src/lib/data.ts) satisfies this. */
export type TimelineIssue = Pick<Issue, 'id' | 'slug' | 'title' | 'category' | 'kind' | 'applies' | 'priority' | 'regions' | 'severity'> &
  Partial<Pick<Issue, 'evidence' | 'when'>>;

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
  /** When set, issues the house-profile answers rule out are drawn ghosted, like other states'. */
  profile?: HouseProfile | null;
  /** compact = home/overview (thin bands); comfortable = taller bands and lane labels. */
  density?: 'compact' | 'comfortable';
  min?: number;
  max?: number;
  /** Accessible name of the slider. */
  label?: string;
  /** Extra text for aria-valuetext, e.g. "14 things apply". */
  describe?: (year: number) => string;
  /**
   * The "what the year line crosses" list under the plot (default: on when interactive).
   * Each crossed band is a link (default `/issue/<slug>`); hovering or focusing it highlights
   * its band and shows the band's annotation.
   */
  crossings?: boolean;
  /** Link for a crossed band in the list. */
  itemHref?: (issue: TimelineIssue, year: number) => string;
  /** Start with the crossings list collapsed on narrow screens (it stays in the HTML). */
  crossingsCollapsible?: boolean;
  className?: string;
};

const DIMS = {
  compact: { axis: 30, laneHead: 19, band: 5, rowGap: 3, laneGap: 11, bottom: 6 },
  comfortable: { axis: 34, laneHead: 21, band: 8, rowGap: 4, laneGap: 15, bottom: 8 },
} as const;

const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
const NOTE_W = 272;

type Hot = { id: string; source: 'hover' | 'list' | 'pin'; x?: number };

/**
 * The signature element: every issue as a band across the build years it applies to, in lanes
 * by category. Sharp end-caps mark legal/recall dates; faded ends mark approximate eras; the
 * solid part is the core (most likely) years; hatched bands are protections a house LACKS
 * ("built before X" ones share one sub-lane per category). A vertical line marks the selected
 * year and the bands it crosses light up (red-oxide for "check first").
 *
 * Reading bands: hover (mouse) or tap (touch) a band for a drafting-style annotation; the list
 * of crossed bands under the plot is the keyboard route (each item highlights its band).
 * Scrubbing: pointer drag, touch horizontal drag (vertical swipes still scroll the page), tap on
 * empty plot, or the slider keys (arrows ±1, Shift ±10, PageUp/PageDown ±10, Home/End, Enter
 * commits).
 */
export function Timeline({
  issues,
  year,
  onYearChange,
  onCommit,
  commitOnRelease = true,
  state = null,
  profile = null,
  density = 'compact',
  min = MIN_YEAR,
  max = MAX_YEAR,
  label = 'Build year',
  describe,
  crossings,
  itemHref = (i) => `/issue/${i.slug}`,
  crossingsCollapsible = false,
  className,
}: TimelineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const domain: Domain = useMemo(() => ({ min, max }), [min, max]);
  const dims = DIMS[density];
  const interactive = Boolean(onYearChange);
  const showCrossings = crossings ?? interactive;
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; active: boolean; touch: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(1000);
  const [hot, setHot] = useState<Hot | null>(null);
  const [listOpen, setListOpen] = useState(true);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 1000));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!crossingsCollapsible || typeof window.matchMedia !== 'function') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- layout-dependent default, client only
    if (window.matchMedia('(max-width: 720px)').matches) setListOpen(false);
  }, [crossingsCollapsible]);

  // A pinned (tapped) annotation closes on Escape or a tap anywhere else.
  useEffect(() => {
    if (hot?.source !== 'pin') return;
    const onDown = (e: PointerEvent) => {
      if (!plotRef.current?.contains(e.target as Node)) setHot(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHot(null);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [hot?.source]);

  /* ---- static layout: lanes, rows, geometry (independent of the selected year) ---- */
  const layout = useMemo(() => {
    type Band = { issue: TimelineIssue; geom: ReturnType<typeof bandGeom>; y: number; shared: boolean };
    type Lane = { cat: (typeof CATEGORIES)[number]; top: number; height: number; bands: Band[] };
    const lanes: Lane[] = [];
    let cursor = dims.axis;
    for (const cat of CATEGORIES) {
      const items = issues.filter((i) => i.category === cat.id);
      if (items.length === 0) continue;
      const { rows, rowOf, order, sharedCount } = packLane(items, domain);
      const top = cursor;
      const bandsTop = top + dims.laneHead;
      const bands = order.map((issue) => ({
        issue,
        geom: bandGeom(issue, domain),
        y: bandsTop + rowOf.get(issue)! * (dims.band + dims.rowGap),
        shared: sharedCount > 0 && rowOf.get(issue) === 0 && issue.kind === 'missing',
      }));
      const height = dims.laneHead + rows * (dims.band + dims.rowGap) - dims.rowGap;
      cursor = top + height + dims.laneGap;
      lanes.push({ cat, top, height, bands });
    }
    const all = lanes.flatMap((l) => l.bands);
    const cands: HitCandidate<TimelineIssue>[] = all.map((b) => {
      const r = bandRange(b.issue, domain.min, domain.max);
      return { item: b.issue, y: b.y, h: dims.band, from: r.from, to: r.to };
    });
    return { lanes, all, cands, byId: new Map(all.map((b) => [b.issue.id, b])), height: cursor - dims.laneGap + dims.bottom };
  }, [issues, domain, dims]);

  const ticks = useMemo(() => decades(domain), [domain]);
  /** In scope for this visitor: their state (if chosen) and their house-profile answers. */
  const inScope = useCallback((i: TimelineIssue) => inState(i, state) && matchesProfile(i, profile), [state, profile]);
  const crossed = useMemo(() => sortIssues(issues.filter((i) => appliesTo(i, year) && inScope(i)), year), [issues, year, inScope]);
  const litCount = crossed.length;

  /* ---- interaction ---- */
  const pointAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = plotRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const fx = (clientX - rect.left) / rect.width;
      return { fx, px: clientX - rect.left, py: clientY - rect.top, yearF: min + fx * (max + 1 - min) };
    },
    [min, max],
  );
  const hitAt = (clientX: number, clientY: number, tol: number) => {
    const p = pointAt(clientX, clientY);
    if (!p) return null;
    const issue = pickBand(layout.cands, Math.floor(p.yearF), p.py, tol);
    return issue ? { issue, x: p.px } : null;
  };

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
    if ((e.target as HTMLElement).closest?.(`.${styles.note}`)) return;
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
    if (!d || d.id !== e.pointerId) {
      // Mouse hover (not dragging): annotate the band under the pointer.
      if (e.pointerType === 'mouse' && hot?.source !== 'pin' && hot?.source !== 'list') {
        const h = hitAt(e.clientX, e.clientY, dims.rowGap);
        if (h) {
          if (hot?.id !== h.issue.id || Math.abs((hot.x ?? 0) - h.x) > 1) setHot({ id: h.issue.id, source: 'hover', x: h.x });
        } else if (hot) setHot(null);
      }
      return;
    }
    if (!d.active) {
      // Touch: start scrubbing only once the gesture is clearly horizontal.
      const dx = Math.abs(e.clientX - d.x0);
      const dy = Math.abs(e.clientY - d.y0);
      if (dx > 6 && dx > dy) {
        d.active = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        if (hot?.source === 'pin') setHot(null);
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
    let y: number | null = null;
    if (d.active) y = setFromClientX(e.clientX);
    else if (d.touch && Math.abs(e.clientY - d.y0) < 10 && Math.abs(e.clientX - d.x0) < 10) {
      // A touch tap: on a band, pin its annotation (tap it again to close); elsewhere, jump to the year.
      const h = hitAt(e.clientX, e.clientY, 7);
      if (h) {
        setHot((prev) => (prev?.source === 'pin' && prev.id === h.issue.id ? null : { id: h.issue.id, source: 'pin', x: h.x }));
        return;
      }
      setHot(null);
      y = setFromClientX(e.clientX);
    }
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
  const pxPerYear = width / (max + 1 - min);
  const labelled = tickLabels(ticks, pxPerYear);
  // Hide decade labels the year tag would sit on top of (tag ~44px wide, label ~30px).
  const tickCovered = (t: number) => Math.abs(t - (year + 0.5)) * pxPerYear < 42;
  const tagAlign = linePct < 6 ? 'start' : linePct > 94 ? 'end' : 'center';
  const valueText = `${year}${describe ? `: ${describe(year)}` : `: ${litCount} issues apply`}`;

  /* ---- the annotation for the hot band ---- */
  const hotBand = hot ? layout.byId.get(hot.id) : undefined;
  let note: React.ReactNode = null;
  if (hot && hotBand) {
    const { issue, geom, y: by } = hotBand;
    const on = appliesTo(issue, year);
    const bandL = (geom.x / 100) * width;
    const bandR = ((geom.x + geom.w) / 100) * width;
    const anchor =
      hot.x !== undefined
        ? Math.min(Math.max(hot.x, bandL + 2), bandR - 2)
        : on
          ? (linePct / 100) * width
          : (bandL + bandR) / 2;
    const place = placeNote(anchor, NOTE_W, width);
    const below = by < layout.height * 0.55;
    const gapPx = 14;
    const peak = coreLabel(issue);
    const why = on ? hiddenReason(issue, profile) : null;
    note = (
      <div
        className={`${styles.note} ${below ? styles.noteBelow : styles.noteAbove} ${hot.source === 'pin' ? styles.notePinned : ''}`}
        style={{
          left: place.left,
          width: place.width,
          ...(below ? { top: by + dims.band + gapPx } : { bottom: layout.height - by + gapPx }),
          ['--ptr' as string]: `${place.pointer}px`,
        }}
        role={hot.source === 'pin' ? 'dialog' : undefined}
        aria-label={hot.source === 'pin' ? issue.title : undefined}
        aria-hidden={hot.source === 'pin' ? undefined : true}
      >
        <span
          className={styles.leader}
          aria-hidden="true"
          style={below ? { left: place.pointer, top: -gapPx, height: gapPx } : { left: place.pointer, bottom: -gapPx, height: gapPx }}
        />
        <span className={styles.noteMeta}>
          <span>{CATEGORY_LABEL[issue.category]}</span>
          <span>{issue.kind === 'missing' ? 'Built without' : 'Often present'}</span>
        </span>
        <span className={styles.noteTitle}>{issue.title}</span>
        <span className={styles.noteYears}>
          {geom.label}
          {peak ? <span className={styles.notePeak}> · {peak}</span> : null}
        </span>
        <span className={styles.noteFoot}>
          {issue.evidence ? <EvidenceStamp evidence={issue.evidence} size="sm" /> : null}
          {issue.priority === 1 && on ? <CheckFirstTag /> : null}
          <span className={on && !why ? styles.noteOn : styles.noteOff}>
            {why ? `Not for your house: ${why}` : on ? `Applies to ${year}` : `Not ${year}`}
          </span>
        </span>
        {hot.source === 'pin' ? (
          <ItemLink href={itemHref(issue, year)} className={styles.noteLink}>
            {itemHref(issue, year).startsWith('#') ? 'Go to it in this report' : 'What to look for'}
            {'\u00a0'}
            <span aria-hidden="true">→</span>
          </ItemLink>
        ) : null}
      </div>
    );
  }

  const laneCrossed = layout.lanes.map((lane) => ({ lane, items: crossed.filter((i) => i.category === lane.cat.id) }));

  return (
    <div
      ref={rootRef}
      className={`${styles.timeline} ${styles[density]} ${interactive ? styles.interactive : ''} ${dragging ? styles.dragging : ''} ${hot ? styles.hasHot : ''} ${className ?? ''}`}
    >
      <div
        ref={plotRef}
        className={styles.plot}
        style={{ height: layout.height }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && hot?.source === 'hover') setHot(null);
        }}
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
            {layout.all.map(({ issue, geom }) => (
              <linearGradient key={`g-${issue.id}`} id={`${uid}-g-${issue.id}`}>
                {geom.stops.map(([o, a], i) => (
                  <stop key={i} offset={o} stopColor="#fff" stopOpacity={a} />
                ))}
              </linearGradient>
            ))}
            {layout.all.map(({ issue }) => (
              <mask key={`m-${issue.id}`} id={`${uid}-m-${issue.id}`} maskContentUnits="objectBoundingBox">
                <rect width="1" height="1" fill={`url(#${uid}-g-${issue.id})`} />
              </mask>
            ))}
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
                className={[
                  styles.tick,
                  t % 20 !== 0 ? styles.tickMinor : '',
                  t - min < 30 && t !== ticks[0] ? styles.tickNearStart : '',
                  !labelled.has(t) ? styles.tickOff : '',
                  tickCovered(t) ? styles.tickHidden : '',
                ].join(' ')}
                textAnchor={t === ticks[0] && pctMid(t - 0.5, domain) < 2 ? 'start' : 'middle'}
              >
                {t}
              </text>
            ))}
          </g>

          {layout.lanes.map((lane) => (
            <g key={lane.cat.id} className={styles.lane}>
              {lane.bands.map(({ issue, geom, y }, i) => {
                const on = appliesTo(issue, year);
                const ghost = !inScope(issue);
                const tone = ghost ? 'ghost' : on ? (issue.priority === 1 ? 'accent' : 'lit') : 'dim';
                const isHot = hot?.id === issue.id;
                const cls = [
                  styles.band,
                  styles[`tone_${tone}`],
                  issue.kind === 'missing' ? styles.missing : '',
                  geom.coreX === null ? styles.noCore : '',
                  isHot ? styles.hot : '',
                ].join(' ');
                return (
                  <g key={issue.id} className={cls} style={{ '--i': i } as React.CSSProperties}>
                    {!interactive && <title>{`${issue.title} · ${geom.label}`}</title>}
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
          ))}

          {hotBand && (
            <rect
              className={styles.hotRing}
              x={`${hotBand.geom.x}%`}
              width={`${hotBand.geom.w}%`}
              y={hotBand.y - 2.5}
              height={dims.band + 5}
              rx="1"
            />
          )}
        </svg>

        {/* the year line (HTML overlay so it can ease smoothly in % units) */}
        <div className={styles.yearLine} style={{ left: `${linePct}%`, top: dims.axis - 6 }} aria-hidden="true">
          <span className={`${styles.yearTag} ${styles[`align_${tagAlign}`]}`}>{year}</span>
        </div>

        {/* lane heads sit above the year line, so it never runs through them */}
        {layout.lanes.map((lane) => {
          const lit = lane.bands.filter(({ issue }) => appliesTo(issue, year) && inScope(issue)).length;
          return (
            <span key={lane.cat.id} className={styles.laneHead} style={{ top: lane.top + 1 }} aria-hidden="true">
              <span className={styles.laneLabel}>{lane.cat.label}</span>
              <span className={`${styles.laneCount} ${lit ? styles.laneCountOn : ''}`}>
                {lit}/{lane.bands.length}
              </span>
            </span>
          );
        })}

        {note}
      </div>

      {showCrossings && (
        <details
          className={styles.crossings}
          open={listOpen}
          onToggle={(e) => setListOpen((e.currentTarget as HTMLDetailsElement).open)}
          onMouseLeave={() => hot?.source === 'list' && setHot(null)}
        >
          <summary className={styles.crossHead}>
            <span className={styles.crossTitle}>
              What the <span className={styles.crossYear}>{year}</span> line crosses
            </span>
            <span className={styles.crossCount}>
              {litCount} {litCount === 1 ? 'band' : 'bands'}
              <span className={styles.crossToggle} aria-hidden="true" />
            </span>
          </summary>
          <dl className={styles.crossList}>
            {laneCrossed.map(({ lane, items }) => (
              <div key={lane.cat.id} className={`${styles.crossLane} ${items.length ? '' : styles.crossEmpty}`}>
                <dt>{lane.cat.label}</dt>
                <dd>
                  {items.length === 0 ? (
                    <span className={styles.crossNone}>Nothing for {year}</span>
                  ) : (
                    <ul>
                      {items.map((i) => (
                        <li key={i.id}>
                          <ItemLink
                            href={itemHref(i, year)}
                            className={`${styles.crossItem} ${hot?.id === i.id ? styles.crossItemHot : ''}`}
                            onMouseEnter={() => setHot({ id: i.id, source: 'list' })}
                            onFocus={() => setHot({ id: i.id, source: 'list' })}
                            onBlur={() => setHot((h) => (h?.source === 'list' && h.id === i.id ? null : h))}
                          >
                            <span
                              className={`${styles.sw} ${i.kind === 'missing' ? styles.swMissing : ''} ${i.priority === 1 ? styles.swFirst : ''}`}
                              aria-hidden="true"
                            />
                            <span className={styles.crossName}>{i.title}</span>
                            {i.priority === 1 ? <span className="visually-hidden"> (check first)</span> : null}
                            {i.kind === 'missing' ? <span className="visually-hidden"> (built without)</span> : null}
                          </ItemLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}

/** In-page links ("#i-slug") are plain anchors (native scroll + hashchange); others use next/link. */
function ItemLink({ href, ...rest }: React.ComponentProps<'a'> & { href: string }) {
  if (href.startsWith('#')) return <a href={href} {...rest} />;
  return <Link href={href} prefetch={false} {...rest} />;
}
