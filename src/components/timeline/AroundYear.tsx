import Link from 'next/link';
import { EVENT_CATEGORY, aroundAxis, eventYears, stackMarks, type EraEvent, type EventPick } from '@/lib/era';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { TierTag } from '@/components/Stamps';
import styles from './AroundYear.module.css';

type Props = { pick: EventPick; id?: string };

/** Minimum clearance between keynotes, in % of the strip (about 22px on a 340px phone strip). */
const GAP = 6.5;

/**
 * "Around YEAR: what was changing in homebuilding". A short drafted year axis with the build year
 * marked and every event as a numbered keynote (ranges as dimension lines), then the events as a
 * keyed list: the year's own first, then its neighbors, then long-running changes it falls inside.
 * Each event carries its source, the source's tier (Wikipedia-only events say "Reference") and the
 * verbatim quote behind a disclosure. Events that are one of the report's issues link to the issue
 * instead of repeating it. Server component: no client code.
 */
export function AroundYear({ pick, id = 'around' }: Props) {
  const { year } = pick;
  const axis = aroundAxis(pick, MIN_YEAR, MAX_YEAR);
  const span = axis.to + 1 - axis.from;
  const x = (y: number) => ((Math.min(Math.max(y, axis.from), axis.to + 1) - axis.from) / span) * 100;
  const numbered = [...pick.exact, ...pick.near, ...pick.ongoing].map((e, i) => ({ e, n: i + 1 }));
  const num = new Map(numbered.map(({ e, n }) => [e.id, n]));
  const points = [...pick.exact, ...pick.near];
  const marks = points.map((e) => ({ from: x(e.year + 0.5), to: e.yearTo ? x(Math.min(e.yearTo, axis.to) + 0.5) : undefined }));
  const levels = stackMarks(marks, GAP);
  const rows = Math.max(1, ...levels.map((l) => l + 1));
  const step = span <= 8 ? 1 : span <= 18 ? 2 : 5;
  const ticks = Array.from({ length: span + 1 }, (_, i) => axis.from + i);
  const nearFrom = pick.near.length ? Math.min(...pick.near.map((e) => e.yearTo && e.yearTo < year ? e.yearTo : e.year)) : null;
  const nearTo = pick.near.length ? Math.max(...pick.near.map((e) => (e.year > year ? e.year : (e.yearTo ?? e.year)))) : null;
  const headId = `${id}-h`;
  const total = numbered.length;

  return (
    <section id={id} className={styles.section} aria-labelledby={headId}>
      <div className="section-head">
        <p className="label">The year in context · events</p>
        <h2 id={headId}>Around {year}: what was changing in homebuilding</h2>
        <p className={styles.lede}>
          {pick.exact.length ? `What happened in ${year} first, then ` : 'The nearest dated events '}
          {pick.exact.length ? 'the nearest dated events ' : ''}within {pick.window} {pick.window === 1 ? 'year' : 'years'} either side
          {pick.ongoing.length ? `, then longer changes ${year} falls inside` : ''}.{' '}
          {pick.widened && !pick.exact.length
            ? `The record is thin around ${year}, so this reaches further than usual. `
            : ''}
          Each comes with its source and how strong that source is.
        </p>
      </div>

      {/* ---------- the strip ---------- */}
      <figure className={styles.strip} style={{ ['--rows' as string]: rows }}>
        <div className={styles.plot} aria-hidden="true">
          <div className={styles.marks}>
            {points.map((e, i) => {
              const m = marks[i];
              const isRange = m.to !== undefined && m.to > m.from;
              return (
                <span
                  key={e.id}
                  className={`${styles.mark} ${e.year === year ? styles.markYear : ''} ${isRange ? styles.markRange : ''}`}
                  style={{ left: `${m.from}%`, width: isRange ? `${m.to! - m.from}%` : undefined, bottom: `calc(${levels[i]} * var(--row))`, ['--lv' as string]: levels[i] }}
                >
                  <span className={`${styles.key} ${e.precision === 'circa' ? styles.keyCirca : ''}`}>{num.get(e.id)}</span>
                  {isRange ? <span className={`${styles.rangeLine} ${e.yearTo! > axis.to ? styles.rangeOpen : ''}`} /> : null}
                </span>
              );
            })}
          </div>
          <div className={styles.axis}>
            {ticks.map((t) => (
              <span key={t} className={styles.tick} style={{ left: `${x(t)}%` }} />
            ))}
            {ticks
              .filter((t) => t <= axis.to && (t - year) % step === 0 && Math.abs(t - year) > (span > 8 ? 1 : 0))
              .map((t) => (
                <span key={`l${t}`} className={styles.tickLabel} style={{ left: `${x(t + 0.5)}%` }}>
                  {t}
                </span>
              ))}
            <span className={styles.yearLine} style={{ left: `${x(year + 0.5)}%` }}>
              <span className={styles.yearTag}>{year}</span>
            </span>
          </div>
          {pick.ongoing.length ? (
            <div className={styles.ongoing}>
              {pick.ongoing.map((e) => (
                <span key={e.id} className={styles.ongoingRow}>
                  <span className={styles.ongoingLine} />
                  <span className={styles.ongoingKey}>
                    <span className={styles.key}>{num.get(e.id)}</span>
                    <span className={styles.ongoingYears}>{eventYears(e)}</span>
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <figcaption className={styles.cap}>
          {total} {total === 1 ? 'event' : 'events'} on a {axis.from}–{axis.to} axis; the tagged line is {year}.
          {pick.exact.length ? ` Filled rings are dated to ${year}.` : ''} Dashed rings are approximate (circa).
          {pick.ongoing.length ? ' Dashed lines below began earlier and run through the whole window.' : ''}
        </figcaption>
      </figure>

      {/* ---------- the list ---------- */}
      <div className={styles.groups}>
        {pick.exact.length ? (
          <EventGroup title={`In ${year}`} events={pick.exact} num={num} lead />
        ) : (
          <p className={styles.none}>Nothing in our timeline is dated to {year} itself.</p>
        )}
        {pick.near.length ? (
          <EventGroup
            title={`Nearby, ${nearFrom} to ${nearTo}`}
            note={`within ${pick.window} ${pick.window === 1 ? 'year' : 'years'} of ${year}`}
            events={pick.near}
            num={num}
          />
        ) : null}
        {pick.ongoing.length ? <EventGroup title={`Under way in ${year}`} note="long-running" events={pick.ongoing} num={num} /> : null}
      </div>

      <p className={styles.foot}>
        Events come from a researched timeline of 150 dated changes to US homebuilding, each checked against the quoted
        source. <TierTag tier="primary" /> is a government or standards body, <TierTag tier="trade" /> a trade body and{' '}
        <TierTag tier="reference" /> a general reference such as Wikipedia. A date is when something began or became
        required, not when every builder followed.
      </p>
    </section>
  );
}

function EventGroup({
  title,
  note,
  events,
  num,
  lead = false,
}: {
  title: string;
  note?: string;
  events: EraEvent[];
  num: Map<string, number>;
  lead?: boolean;
}) {
  return (
    <div className={`${styles.group} ${lead ? styles.groupLead : ''}`}>
      <h3 className={styles.groupHead}>
        <span>{title}</span>
        {note ? <span className={styles.groupNote}>{note}</span> : null}
      </h3>
      <ol className={styles.events}>
        {events.map((e) => (
          <EventItem key={e.id} e={e} n={num.get(e.id)!} lead={lead} />
        ))}
      </ol>
    </div>
  );
}

function EventItem({ e, n, lead }: { e: EraEvent; n: number; lead: boolean }) {
  const withQuote = e.sources.filter((s) => s.quote);
  return (
    <li className={`${styles.event} ${lead ? styles.eventLead : ''}`}>
      <span className={`${styles.key} ${styles.listKey} ${e.precision === 'circa' ? styles.keyCirca : ''}`} aria-hidden="true">
        {n}
      </span>
      <div className={styles.when}>
        <span className={styles.whenYears}>{eventYears(e).replace(/^c\. /, '')}</span>
        {e.precision === 'circa' ? <span className={styles.circa}>circa</span> : null}
      </div>
      <div className={styles.body}>
        <p className={styles.cat}>{EVENT_CATEGORY[e.category] ?? e.category}</p>
        <h4 className={styles.title}>{e.title}</h4>
        {e.issue ? (
          <p className={styles.issueLink}>
            In this report&rsquo;s record of issues:{' '}
            <Link href={`/issue/${e.issue}`} prefetch={false}>
              {e.issueTitle}
            </Link>{' '}
            <span aria-hidden="true">→</span>
          </p>
        ) : (
          <p className={styles.text}>{e.text}</p>
        )}
        <div className={styles.sources}>
          {e.sources
            .filter((s, i, all) => all.findIndex((x) => x.publisher === s.publisher) === i)
            .map((s, i) => (
            <span key={s.url + i} className={styles.source}>
              <a href={s.url} rel="noopener">
                {s.publisher}
              </a>
              <TierTag tier={s.tier} />
            </span>
          ))}
          {withQuote.length && !e.issue ? (
            <details className={styles.quote}>
              <summary>{withQuote.length === 1 ? 'Quote' : 'Quotes'}</summary>
              {withQuote.map((s, i) => (
                <blockquote key={i} cite={s.url}>
                  &ldquo;{s.quote}&rdquo; <cite>{s.publisher}</cite>
                </blockquote>
              ))}
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}
