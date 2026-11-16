import { ImageResponse } from 'next/og';
import { getIssues, getMeta } from '@/lib/data';
import { MAX_YEAR, MIN_YEAR, SITE } from '@/lib/site';
import { C, OG_SIZE, OG_TYPE, OgFrame, OgScale, OgTimeline, mono, ogOptions } from '@/components/seo/og';

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = `${SITE.name}: ${SITE.tagline}`;

const W = 1200 - 72 - 4 - 44;

export default function Image() {
  const meta = getMeta();
  return new ImageResponse(
    (
      <OgFrame footRight={`${meta.issueCount} issues · ${meta.sourceCount} verified sources · ${MIN_YEAR}–${MAX_YEAR}`}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '22px 22px 0' }}>
          <span style={mono(15)}>When was your house built?</span>
          <span style={{ fontFamily: 'Fraunces Head', fontSize: 84, lineHeight: 1.02, letterSpacing: '-0.025em', color: C.ink, marginTop: 30, maxWidth: 1100 }}>
            What your house was built with
          </span>
          <span style={{ fontFamily: 'Plex Sans', fontSize: 25, lineHeight: 1.4, color: C.ink2, marginTop: 18, maxWidth: 860 }}>
            Enter the year. See what houses of that era often contain, what to check first, and what was not yet required.
            Every claim sourced.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 22px', gap: 10 }}>
          <OgTimeline issues={getIssues()} width={W} height={110} />
          <OgScale width={W} />
        </div>
      </OgFrame>
    ),
    ogOptions(),
  );
}
