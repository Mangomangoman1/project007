import { ImageResponse } from 'next/og';
import { getIssue, getIssues } from '@/lib/data';
import { CATEGORY_LABEL, EVIDENCE } from '@/lib/labels';
import { yearsLabel } from '@/lib/timeline';
import { kindLabel } from '@/components/issue/issueText';
import { C, OG_SIZE, OG_TYPE, OgBand, OgFrame, OgScale, mono, ogOptions } from '@/components/seo/og';

export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const alt = 'An issue: the years it applies, how to check, and its sources';
export const dynamicParams = false;

export function generateStaticParams() {
  return getIssues().map((i) => ({ slug: i.slug }));
}

const W = 1200 - 72 - 4 - 44;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const issue = getIssue((await params).slug) ?? getIssues()[0];
  const t = issue.title;
  const titleSize = t.length > 52 ? 58 : t.length > 34 ? 70 : 84;
  const years = yearsLabel(issue).replace(/^Built /, '');
  const stampBorder = issue.evidence === 'era' ? `2px dashed ${C.ink3}` : `2px solid ${issue.evidence === 'rule' ? C.line : C.ink}`;
  const stampColor = issue.evidence === 'era' ? C.ink3 : issue.evidence === 'rule' ? C.line : C.ink;

  return new ImageResponse(
    (
      <OgFrame footRight="A guide to what to look for · Not an inspection">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '22px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            {issue.priority === 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 11, height: 11, backgroundColor: C.accent, transform: 'rotate(45deg)' }} />
                <span style={mono(15, C.accent)}>Check first</span>
              </div>
            ) : null}
            <span style={mono(15)}>{`${kindLabel(issue)} · ${CATEGORY_LABEL[issue.category]}`}</span>
          </div>
          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Fraunces Head', fontSize: titleSize, lineHeight: 1.04, letterSpacing: '-0.02em', color: C.ink, maxWidth: 1000 }}>
              {t}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={mono(14)}>{issue.kind === 'missing' ? 'Houses built without it' : 'Houses built'}</span>
              <span style={{ fontFamily: 'Fraunces', fontSize: 64, lineHeight: 1, color: C.ink }}>{years}</span>
            </div>
            <div style={{ display: 'flex', padding: '7px 14px 6px', border: stampBorder, ...mono(15, stampColor) }}>
              {EVIDENCE[issue.evidence].short}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 22px 0', borderTop: `1px solid ${C.rule}` }}>
          <OgBand issue={issue} width={W} height={20} color={issue.priority === 1 ? C.accent : C.line} />
          <OgScale width={W} />
        </div>
      </OgFrame>
    ),
    ogOptions(),
  );
}
