import { ImageResponse } from 'next/og';
import { allYears, getIssues, getIssuesForYear } from '@/lib/data';
import { MAX_YEAR, isValidYear } from '@/lib/site';
import { plural } from '@/lib/labels';
import { C, OG_SIZE, OG_TYPE, OgFrame, OgScale, OgTimeline, mono, ogOptions } from '@/components/seo/og';

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'What a US house built in this year often has';
export const dynamicParams = false;

export function generateStaticParams() {
  return allYears().map((y) => ({ year: String(y) }));
}

const W = 1200 - 72 - 4 - 44;

function Cell({ n, label, accent = false, unit }: { n: number; label: string; accent?: boolean; unit?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '14px 20px 16px' }}>
      <span style={mono(13, accent ? C.accent : C.ink3)}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'Fraunces', fontSize: 78, lineHeight: 1, color: accent ? C.accent : C.ink }}>{n}</span>
        {unit ? <span style={mono(15, C.ink3, 400)}>{unit}</span> : null}
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ year: string }> }) {
  const raw = (await params).year;
  const year = isValidYear(Number(raw)) ? Number(raw) : MAX_YEAR;
  const issues = getIssuesForYear(year);
  const first = issues.filter((i) => i.priority === 1).length;
  const missing = issues.filter((i) => i.kind === 'missing').length;
  const age = MAX_YEAR - year;
  const rule = `1px solid ${C.rule}`;

  return new ImageResponse(
    (
      <OgFrame footRight="A guide to what to look for · Not an inspection">
        <div style={{ display: 'flex', height: 330, borderBottom: rule }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 600, padding: '18px 22px 0', borderRight: rule }}>
            <span style={mono(15)}>Report · houses built in</span>
            <span style={{ fontFamily: 'Fraunces', fontSize: 268, lineHeight: 1, letterSpacing: '-0.04em', marginLeft: -8, marginTop: 4, color: C.ink }}>
              {year}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '18px 22px 16px', borderBottom: rule, gap: 6 }}>
              <span style={{ fontFamily: 'Fraunces Head', fontSize: 44, lineHeight: 1.08, color: C.ink }}>
                {`${plural(issues.length, 'thing')} to know about ${/^18/.test(String(year)) ? 'an' : 'a'} ${year} house`}
              </span>
            </div>
            <div style={{ display: 'flex', flex: 1 }}>
              <div style={{ display: 'flex', flex: 1, borderRight: rule }}>
                <Cell n={first} label="Check first" accent={first > 0} />
              </div>
              <div style={{ display: 'flex', flex: 1, borderRight: rule }}>
                <Cell n={missing} label="Built without" />
              </div>
              <div style={{ display: 'flex', flex: 1 }}>
                <Cell n={age} label="Age" unit={age === 1 ? 'yr' : 'yrs'} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 22px 0', gap: 10 }}>
          <OgTimeline issues={getIssues()} width={W} height={112} year={year} />
          <OgScale width={W} year={year} />
        </div>
      </OgFrame>
    ),
    ogOptions(),
  );
}
