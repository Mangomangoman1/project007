import Link from 'next/link';
import { SITE } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { DocNote, DocPage, FactList, docStyles } from '@/components/doc/DocPage';
import { ForgetDevice } from '@/components/doc/ForgetDevice';
import { Contact } from '@/components/doc/Contact';

export const metadata = pageMeta({
  title: 'Privacy',
  shareTitle: `Privacy at ${SITE.name}`,
  description:
    'No accounts, no cookies, no ads or trackers. Your house answers, year, state and ZIP stay in this browser, with a button to forget them. Page views are counted anonymously.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <DocPage
      kicker="Privacy · what happens with your data"
      title="Your answers stay on your device"
      lede={
        <p>
          {SITE.name} has no accounts, no cookies and no advertising. What you tell it about your house is kept in your own
          browser and never sent to us. This page lists exactly what is stored, what reaches a server, and how to clear it.
        </p>
      }
      cells={[
        { label: 'Accounts', value: 'None' },
        { label: 'Cookies', value: 'None' },
        { label: 'Ads or trackers', value: 'None' },
        { label: 'Your answers', value: 'This device', note: 'browser storage only' },
      ]}
      stamp={`Last updated ${SITE.policiesUpdated}`}
      path="/privacy"
      crumb="Privacy"
      sections={[
        {
          id: 'short',
          title: 'In short',
          body: (
            <ul>
              <li>No sign-up, no accounts, no cookies, no advertising, no third-party trackers.</li>
              <li>
                Your year, state, ZIP code, house answers and &ldquo;last replaced&rdquo; dates are kept in this
                browser&rsquo;s local storage. They are not sent to us or anyone else.
              </li>
              <li>A ZIP lookup asks this site for one static data file. It goes nowhere else.</li>
              <li>
                If you choose to report an error with the form on the corrections page, what you type is emailed to the
                people who maintain this site. It is not stored on the site.
              </li>
              <li>
                We count page views with Vercel Web Analytics and measure page speed with Vercel Speed Insights. Both are
                anonymous and use no cookies.
              </li>
              <li>Like any website, our host keeps ordinary server logs.</li>
            </ul>
          ),
        },
        {
          id: 'device',
          title: 'What is saved on your device',
          body: (
            <>
              <p>
                To save you retyping, the site remembers a few things in your browser&rsquo;s local storage. Each entry
                starts with <code>builtin:</code>. Nothing is saved until you use the feature it belongs to.
              </p>
              <FactList
                items={[
                  { term: 'Year and state', text: 'The last build year you looked at and the state you chose, so reports open where you left off.' },
                  { term: 'About your house', text: 'Your answers to the optional house questions (foundation, heating, gas and so on), and whether that panel is open.' },
                  { term: 'Last replaced', text: 'Years or decades you entered for when parts were last replaced, kept per build year.' },
                  { term: 'Your place', text: 'The ZIP code you entered, and which state you chose to keep if it differed.' },
                  { term: 'Theme', text: 'Paper or Blueprint, if you picked one.' },
                ]}
              />
              <p>
                Local storage is not a cookie: it is never sent with requests, and only pages on this site can read it. It
                stays until you clear it.
              </p>
              <h3 id="forget">Clear it</h3>
              <ForgetDevice />
              <p className={docStyles.noJsOnly}>
                With JavaScript off, nothing is saved, so there is nothing to clear.
              </p>
              <p>
                You can also clear it from your browser: remove the site data for yearbuilt.house in your browser&rsquo;s
                privacy settings. In a private window, everything is forgotten when the window closes. Each answer can also be
                undone where you gave it: &ldquo;Clear all&rdquo; in About your house, &ldquo;Forget this ZIP&rdquo; in Your
                place.
              </p>
            </>
          ),
        },
        {
          id: 'requests',
          title: 'What reaches a server',
          body: (
            <>
              <p>
                Pages are prepared in advance and sent the same to everyone. Filtering by your state or your answers happens
                in your browser, so the server never learns them. The only thing you can send us is an error report, if you
                choose to (see <a href="#reports">the next section</a>).
              </p>
              <p>
                <strong>ZIP lookups.</strong> When you enter a ZIP code, your browser asks this site for one static file named
                after the ZIP&rsquo;s first three digits (for example <code>/place/zip/837.json</code>), plus a list of
                counties. The lookup happens in your browser. Like any request, it shows up in our host&rsquo;s logs. It is
                not sent to any other service.
              </p>
              <p>
                <strong>Links out.</strong> Sources link to the agencies and publishers that wrote them. Once you follow a
                link, that site&rsquo;s own privacy terms apply.
              </p>
              <p>Fonts and scripts are served from this site, not from font or script services.</p>
            </>
          ),
        },
        {
          id: 'reports',
          title: 'If you report an error',
          body: (
            <>
              <p>
                The <Link href="/corrections#report">form on the corrections page</Link> is optional. When you send it,
                what you typed (the message, the page, a source and, if you give one, your email address) is sent by email to
                the people who maintain {SITE.name}, through <strong>Resend</strong>, an email delivery service. The email
                also says when it was sent. Nothing else about you is added to it.
              </p>
              <ul>
                <li>Reports are not stored on this site or in any database. They exist only as emails.</li>
                <li>
                  Your email address is optional. If you give one, it is used only to answer you about your report, never
                  for a mailing list or anything else.
                </li>
                <li>
                  Please do not include personal or sensitive information. A pointer to the problem and a source is all we
                  need.
                </li>
                <li>
                  To stop one connection sending dozens of reports, the site keeps a short-lived count per IP address in
                  memory for ten minutes. The IP address is not put in the email and is not saved.
                </li>
              </ul>
              <p>
                Resend handles the message only to deliver it; its{' '}
                <a href="https://resend.com/legal/privacy-policy" rel="noopener">
                  privacy policy
                </a>{' '}
                applies to that delivery. If you would rather we deleted a report you sent, say so in another report.
              </p>
            </>
          ),
        },
        {
          id: 'analytics',
          title: 'Page views and speed',
          body: (
            <>
              <p>
                We use <strong>Vercel Web Analytics</strong> to count page views, and <strong>Vercel Speed Insights</strong>{' '}
                to measure how fast pages load for real visitors. Both are run by Vercel, our host, load from this
                site&rsquo;s own address, and set no cookies.
              </p>
              <ul>
                <li>
                  We send the address of the page without anything after a <code>?</code> or <code>#</code>. Vercel adds
                  general details from the request, such as the referring site, country, browser, operating system and
                  device type, and for Speed Insights, loading-time measurements.
                </li>
                <li>
                  According to Vercel, visitors are not identified: there is no cookie or ID in your browser, and the hash
                  used to tell visits apart is reset every day.
                </li>
                <li>We see totals in a dashboard. We do not see who you are, and we do not combine this with anything else.</li>
              </ul>
              <p>
                Vercel describes this in its{' '}
                <a href="https://vercel.com/docs/analytics/privacy-policy" rel="noopener">
                  Web Analytics privacy notes
                </a>{' '}
                and{' '}
                <a href="https://vercel.com/docs/speed-insights/privacy-policy" rel="noopener">
                  Speed Insights privacy notes
                </a>
                . A content blocker that blocks them does not affect the site.
              </p>
            </>
          ),
        },
        {
          id: 'logs',
          title: 'Server logs',
          body: (
            <p>
              Our host, Vercel, keeps ordinary request logs (such as the address requested, time, IP address and browser) for a
              limited time to run and protect the service. We do not use them to build a picture of any visitor.
            </p>
          ),
        },
        {
          id: 'not',
          title: 'What we do not do',
          body: (
            <ul>
              <li>We do not sell, rent or share data about visitors. We have none to share.</li>
              <li>No advertising, ad networks, social media pixels or session recording.</li>
              <li>No email list, no accounts, no tracking across other sites.</li>
              <li>We do not keep error reports anywhere but the email they arrive in, and never publish who sent one.</li>
            </ul>
          ),
        },
        {
          id: 'changes',
          title: 'Changes and questions',
          body: (
            <>
              <p>
                If what the site does with data changes, this page changes first, with a new date at the top. The{' '}
                <Link href="/terms">terms of use</Link> cover everything else.
              </p>
              <p>
                Questions: <Contact />
              </p>
            </>
          ),
        },
      ]}
      after={
        <DocNote big="Nothing to sign up for. No cookie banner to click.">
          <p>
            Your answers about your house never leave this browser. Clear them any time with the button above.
          </p>
        </DocNote>
      }
    />
  );
}
