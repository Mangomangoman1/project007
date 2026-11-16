import Link from 'next/link';
import { MAX_YEAR, MIN_YEAR, SITE } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { DocNote, DocPage } from '@/components/doc/DocPage';
import { Contact } from '@/components/doc/Contact';

export const metadata = pageMeta({
  title: 'Terms of use and disclaimer',
  shareTitle: `${SITE.name} terms of use`,
  description:
    'General information about what US houses of an era often have. Not an inspection or professional advice, no warranty of accuracy, and safety rules for checking your own house.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <DocPage
      kicker="Terms of use · disclaimer"
      title="What this site is, and what it is not"
      lede={
        <p>
          {SITE.name} is free general information about what US houses built in a given year often contain. By using it you
          accept these terms. They are short, and they matter most where your safety and your money are involved.
        </p>
      }
      cells={[
        { label: 'It is', value: 'General information' },
        { label: 'It is not', value: 'An inspection' },
        { label: 'Covers', value: 'US houses', note: `built ${MIN_YEAR}–${MAX_YEAR}` },
        { label: 'Cost', value: 'Free' },
      ]}
      stamp={`Last updated ${SITE.policiesUpdated}`}
      path="/terms"
      crumb="Terms of use"
      sections={[
        {
          id: 'what',
          title: 'General information about an era',
          body: (
            <>
              <p>
                The site describes what houses built in a given year <strong>often</strong> have: materials, products and
                protections that were common, recalled or missing at the time. It does not describe any particular house. It
                has never seen yours.
              </p>
              <p>
                A build year is a clue, not a finding. Renovations, repairs and replacements change what a house contains,
                and many houses have already had these things fixed. Something listed for your year may not be in your
                house, and your house may have problems the site does not mention.
              </p>
              <p>
                It covers houses in the United States only. Apartments and commercial buildings follow different rules.
              </p>
            </>
          ),
        },
        {
          id: 'advice',
          title: 'Not professional advice',
          body: (
            <>
              <p>Nothing on this site is, or replaces:</p>
              <ul>
                <li>a home inspection, or a test for asbestos, lead, radon, mold or anything else;</li>
                <li>an assessment by a licensed electrician, plumber, gas fitter, roofer, structural engineer or other professional;</li>
                <li>legal advice, including about a purchase, a disclosure, a claim or a settlement;</li>
                <li>insurance advice, including about what a policy covers;</li>
                <li>medical advice about exposure to lead, asbestos, carbon monoxide or anything else.</li>
              </ul>
              <p>
                For decisions about a specific house, ask the right licensed professional. Before you buy, get a full
                inspection.
              </p>
            </>
          ),
        },
        {
          id: 'accuracy',
          title: 'Accuracy and sources',
          body: (
            <>
              <p>
                Every claim is drawn from a cited source, and the sources are shown with quotes so you can check them. We
                work to get things right, but we make no promise that the site is accurate, complete or current.
              </p>
              <ul>
                <li>
                  Dates, counts and figures come from the cited sources. A source can be wrong, can be summarized imperfectly
                  here, or can be overtaken by newer information.
                </li>
                <li>
                  Code dates are the dates a model code or federal rule took effect. States and towns often adopted them
                  later, or not at all.
                </li>
                <li>
                  Recalls, settlements and claim deadlines change and close. Always check the original notice from the
                  agency, manufacturer or court before you act on one.
                </li>
                <li>
                  &ldquo;Your place&rdquo; facts are area-level estimates for a ZIP code or county, not facts about your
                  house.
                </li>
              </ul>
              <p>
                If you find a mistake, please tell us: see <Link href="/corrections">corrections</Link>.
              </p>
            </>
          ),
        },
        {
          id: 'safety',
          title: 'Safety',
          body: (
            <>
              <p>
                The &ldquo;how to check&rdquo; steps are things you can look at without taking anything apart. Do not go
                further on the strength of this site:
              </p>
              <ul>
                <li>Do not open electrical panels, outlets, switches or fixtures, or remove their covers.</li>
                <li>
                  Do not disturb, cut, sand, drill or remove anything that might contain asbestos or lead paint. Have it
                  tested first.
                </li>
                <li>
                  Do not enter attics, crawl spaces, roofs or other spaces that are unsafe, poorly ventilated or hard to get
                  out of.
                </li>
                <li>Do not move, disconnect or adjust gas appliances, gas lines or their connectors.</li>
                <li>If you smell gas, leave the house and call your gas utility or 911 from outside.</li>
              </ul>
              <p>
                Hire licensed professionals for any inspection, testing, repair or removal, and follow the instructions of
                the agencies the site cites.
              </p>
            </>
          ),
        },
        {
          id: 'use',
          title: 'Using the site',
          body: (
            <>
              <p>
                You are welcome to read, print and share the reports and checklists for your own use, for example when
                viewing or maintaining a house. Please do not present them as an inspection report or as advice from us.
              </p>
              <p>
                Links to other websites are provided for reference. We do not control those sites and are not responsible
                for their content.
              </p>
            </>
          ),
        },
        {
          id: 'liability',
          title: 'No warranty, limited liability',
          body: (
            <>
              <p>
                The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind,
                express or implied, including fitness for a particular purpose.
              </p>
              <p>
                To the fullest extent the law allows, the people behind {SITE.name} are not liable for any loss, damage,
                injury or cost arising from using the site or relying on anything in it, including decisions about buying,
                selling, repairing, insuring or living in a house. Some places do not allow certain limits on liability, so
                parts of this may not apply to you.
              </p>
            </>
          ),
        },
        {
          id: 'changes',
          title: 'Changes and contact',
          body: (
            <>
              <p>
                We may update these terms. The date at the top shows the latest version. How we handle data is on the{' '}
                <Link href="/privacy">privacy page</Link>.
              </p>
              <p>
                Questions: <Contact />
              </p>
            </>
          ),
        },
      ]}
      after={
        <DocNote big={SITE.disclaimer}>
          <p>
            Use it to know what to look for and what to ask. For anything involving gas, electrical, asbestos, lead or the
            structure, ask a licensed professional.
          </p>
        </DocNote>
      }
    />
  );
}
