import Link from 'next/link';
import { getMeta } from '@/lib/data';
import { SITE } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { CORRECTIONS } from '@/lib/corrections';
import { DocPage, docStyles } from '@/components/doc/DocPage';
import { CorrectionForm } from '@/components/corrections/CorrectionForm';

export const metadata = pageMeta({
  title: 'Corrections',
  shareTitle: `Corrections at ${SITE.name}`,
  description:
    'Report an error on Year Built with a short form, and see how corrections are handled: we check the source, fix the page, and list every material correction here with its date.',
  path: '/corrections',
});

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default function CorrectionsPage() {
  const meta = getMeta();
  const n = CORRECTIONS.length;
  return (
    <DocPage
      kicker="Corrections · how errors are fixed"
      title="Found a mistake? Tell us."
      lede={
        <p>
          Every claim on {SITE.name} comes from a cited source, and sources can be misread or go out of date. If something
          looks wrong, we want to know. Material corrections are listed on this page with the date.
        </p>
      }
      cells={[
        { label: 'Corrections so far', value: n === 0 ? 'None yet' : n },
        { label: 'Sources cited', value: meta.sourceCount, note: `${meta.primarySourceCount} primary` },
      ]}
      stamp={`Last updated ${SITE.policiesUpdated}`}
      path="/corrections"
      crumb="Corrections"
      sections={[
        {
          id: 'report',
          title: 'How to report an error',
          body: (
            <>
              <p>
                Use the form below. It helps most to say what you think is wrong in a sentence or two, which page it is on
                (filled in for you when you follow a &ldquo;Report an error&rdquo; link), and a source that shows it if you
                have one. You do not need to be an expert: a pointer to the problem is enough.
              </p>
              <CorrectionForm />
            </>
          ),
        },
        {
          id: 'handling',
          title: 'How corrections are handled',
          body: (
            <ol>
              <li>
                <strong>We check the source.</strong> We reopen the cited source, and any you sent, and compare it word for
                word with what the page says.
              </li>
              <li>
                <strong>We fix it.</strong> If the page is wrong, we correct the claim, the date or the figure everywhere it
                appears: the issue page, the year reports, the timeline and the printable checklists.
              </li>
              <li>
                <strong>We note it here.</strong> Material corrections are listed below with the date and what changed. Small
                fixes, such as typos or clearer wording, are made without a note.
              </li>
            </ol>
          ),
        },
        {
          id: 'material',
          title: 'What counts as material',
          body: (
            <p>
              A correction is material when it changes a fact you might rely on: the years an issue applies to, whether
              something was recalled or settled, a figure or count, how to check, what to do, or a source that turns out not
              to support the claim. If a source is withdrawn or its link breaks, we replace or remove it, and say so here if
              that changes a claim.
            </p>
          ),
        },
        {
          id: 'so-far',
          title: 'Corrections so far',
          body:
            n === 0 ? (
              <div className={docStyles.ledger}>
                <p className={docStyles.ledgerEmpty}>None yet.</p>
              </div>
            ) : (
              <ol className={docStyles.ledger}>
                {CORRECTIONS.map((c) => (
                  <li key={`${c.date}-${c.path}`}>
                    <time dateTime={c.date}>{longDate(c.date)}</time>
                    <span>
                      <Link href={c.path}>{c.page}</Link>: {c.summary}
                    </span>
                  </li>
                ))}
              </ol>
            ),
        },
      ]}
    />
  );
}
