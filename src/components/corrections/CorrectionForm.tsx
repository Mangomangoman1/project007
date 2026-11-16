'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent, type Ref } from 'react';
import {
  ERROR_TEXT,
  FIELD_OF,
  HONEYPOT,
  LIMITS,
  RENDERED_AT,
  cleanPage,
  cleanText,
  isErrorCode,
  isValidEmail,
  type ErrorCode,
  type Field,
} from '@/lib/contact';
import styles from './CorrectionForm.module.css';

type Values = { message: string; page: string; source: string; email: string };
type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; page: string | null; replyTo: boolean }
  | { kind: 'failed'; code: ErrorCode | 'network' };

const EMPTY: Values = { message: '', page: '', source: '', email: '' };
const fmt = (n: number) => n.toLocaleString('en-US');

/** Client-side check, the same rules the endpoint applies (src/lib/contact.ts). */
function validate(v: Values): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  const message = cleanText(v.message, true);
  if (!message) errors.message = 'Tell us what looks wrong.';
  else if (message.length < LIMITS.messageMin) errors.message = ERROR_TEXT['message-short'];
  else if (message.length > LIMITS.messageMax) errors.message = ERROR_TEXT['message-long'];
  if (cleanText(v.source).length > LIMITS.sourceMax) errors.source = ERROR_TEXT['source-long'];
  const email = cleanText(v.email);
  if (email && !isValidEmail(email)) errors.email = ERROR_TEXT['email-invalid'];
  return errors;
}

const FAILED_TEXT: Record<ErrorCode | 'network', { title: string; body: string }> = {
  'not-configured': {
    title: 'The form is not available right now',
    body: 'Reports cannot be sent from this site at the moment. Nothing was sent. Your text is still here, so you can copy it and try again later.',
  },
  'rate-limited': { title: 'Please wait a few minutes', body: ERROR_TEXT['rate-limited'] },
  'send-failed': { title: 'Not sent', body: ERROR_TEXT['send-failed'] + ' Your text is still here.' },
  'too-large': { title: 'Too long to send', body: ERROR_TEXT['too-large'] },
  'bad-request': { title: 'Not sent', body: ERROR_TEXT['bad-request'] },
  network: {
    title: 'Not sent: no connection',
    body: 'The report could not reach the site. Check your connection and send it again. Your text is still here.',
  },
  'message-short': { title: 'Check the message', body: ERROR_TEXT['message-short'] },
  'message-long': { title: 'Check the message', body: ERROR_TEXT['message-long'] },
  'email-invalid': { title: 'Check the email address', body: ERROR_TEXT['email-invalid'] },
  'source-long': { title: 'Check the source', body: ERROR_TEXT['source-long'] },
};

/**
 * The "Report an error" form on /corrections. The static HTML is a plain form that POSTs to
 * /api/corrections and works without JavaScript: the endpoint answers with a 303 to
 * /corrections?sent=1#sent or ?error=<code>#e-<code>, and the matching note below is shown with
 * :target (the page stays static and cacheable). With JavaScript the same form is sent with fetch,
 * validated inline, the page field is prefilled from ?page=, and states are announced politely.
 */
export function CorrectionForm() {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [announce, setAnnounce] = useState('');
  const [copied, setCopied] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const renderedAt = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef<HTMLHeadingElement>(null);

  // After hydration: stamp the render time, prefill the page, and pick up a ?sent / ?error state.
  useEffect(() => {
    if (renderedAt.current) renderedAt.current.value = String(Date.now());
    const q = new URLSearchParams(window.location.search);
    const page = cleanPage(q.get('page'), window.location.origin);
    /* eslint-disable react-hooks/set-state-in-effect -- reading the URL after hydration (the page is static) */
    setEnhanced(true);
    if (page) setValues((v) => ({ ...v, page }));
    const err = q.get('error');
    if (q.get('sent') === '1') setStatus({ kind: 'sent', page: null, replyTo: false });
    else if (isErrorCode(err)) setStatus({ kind: 'failed', code: err });
    /* eslint-enable react-hooks/set-state-in-effect */
    if (q.has('sent') || q.has('error')) {
      const keep = page ? `?page=${encodeURIComponent(page).replace(/%2F/gi, '/')}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}${keep}#report`);
    }
  }, []);

  // Move focus to whatever just changed, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (status.kind === 'sent') sentRef.current?.focus();
    else if (status.kind === 'failed' && !FIELD_OF[status.code as ErrorCode]) statusRef.current?.focus();
  }, [status]);

  const set = (f: keyof Values) => (e: { target: { value: string } }) => {
    const next = { ...values, [f]: e.target.value };
    setValues(next);
    if (f !== 'page' && (touched[f as Field] || errors[f as Field])) setErrors((er) => ({ ...er, [f]: validate(next)[f as Field] }));
    if (status.kind === 'failed' && status.code !== 'not-configured' && status.code !== 'rate-limited') setStatus({ kind: 'idle' });
  };
  const blur = (f: Field) => () => {
    setTouched((t) => ({ ...t, [f]: true }));
    // don't nag about an empty message on the way past; that is checked on send
    if (f === 'message' && !values.message.trim()) return;
    setErrors((er) => ({ ...er, [f]: validate(values)[f] }));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === 'sending') return;
    const found = validate(values);
    setErrors(found);
    setTouched({ message: true, source: true, email: true });
    const bad = (['message', 'source', 'email'] as Field[]).filter((f) => found[f]);
    if (bad.length) {
      setAnnounce(bad.length === 1 ? 'One field needs a look.' : `${bad.length} fields need a look.`);
      document.getElementById(id(bad[0]))?.focus();
      return;
    }
    const form = formRef.current!;
    const body = {
      message: values.message,
      page: values.page,
      source: values.source,
      email: values.email,
      [HONEYPOT]: (form.elements.namedItem(HONEYPOT) as HTMLInputElement | null)?.value ?? '',
      [RENDERED_AT]: renderedAt.current?.value ?? '',
    };
    setStatus({ kind: 'sending' });
    setAnnounce('Sending your report…');
    try {
      const res = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data: { ok?: boolean; code?: string; field?: Field } = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus({ kind: 'sent', page: cleanPage(values.page, window.location.origin), replyTo: !!cleanText(values.email) });
        setAnnounce('');
        setValues(EMPTY);
        setErrors({});
        setTouched({});
        return;
      }
      const code: ErrorCode = isErrorCode(data.code) ? data.code : res.status === 503 ? 'not-configured' : 'send-failed';
      const field = FIELD_OF[code];
      if (field) {
        setErrors((er) => ({ ...er, [field]: ERROR_TEXT[code] }));
        setStatus({ kind: 'idle' });
        setAnnounce('One field needs a look.');
        document.getElementById(id(field))?.focus();
        return;
      }
      setStatus({ kind: 'failed', code });
      setAnnounce(FAILED_TEXT[code].title);
    } catch {
      setStatus({ kind: 'failed', code: 'network' });
      setAnnounce(FAILED_TEXT.network.title);
    }
  };

  const copy = async () => {
    const text = [values.message, values.page && `Page: ${values.page}`, values.source && `Source: ${values.source}`]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setAnnounce('Copied to the clipboard.');
    } catch {
      document.getElementById(id('message'))?.focus();
      (document.getElementById(id('message')) as HTMLTextAreaElement | null)?.select();
    }
  };

  const again = () => {
    setStatus({ kind: 'idle' });
    setCopied(false);
    if (renderedAt.current) renderedAt.current.value = String(Date.now());
    requestAnimationFrame(() => document.getElementById(id('message'))?.focus());
  };

  const len = values.message.length;
  const trimmedLen = cleanText(values.message, true).length;
  const sending = status.kind === 'sending';
  const failed = status.kind === 'failed' ? FAILED_TEXT[status.code] : null;
  const notConfigured = status.kind === 'failed' && status.code === 'not-configured';
  const describe = (f: Field, hint = true) =>
    [hint && id(`${f}-hint`), errors[f] && id(`${f}-err`), f === 'message' && id('count')].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.root} data-enhanced={enhanced ? '' : undefined}>
      {/* polite announcements for screen readers (status changes, field problems) */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announce}
      </p>

      {/* ---------- without JavaScript: states reached by the endpoint's 303, shown with :target ---------- */}
      <section id="sent" className={`${styles.target} ${styles.sent}`} aria-labelledby="sent-h-static" tabIndex={-1}>
        <SentNote headingId="sent-h-static" />
      </section>
      {(Object.keys(FAILED_TEXT) as (ErrorCode | 'network')[])
        .filter((c) => c !== 'network')
        .map((c) => (
          <div key={c} id={`e-${c}`} className={`${styles.target} ${styles.notice}`} role="alert" data-tone={c === 'not-configured' ? 'off' : 'warn'}>
            <p className={styles.noticeTitle}>{FAILED_TEXT[c].title}</p>
            <p>
              {c === 'not-configured'
                ? 'Reports cannot be sent from this site at the moment, and nothing was sent. Please try again later.'
                : FIELD_OF[c]
                  ? `${ERROR_TEXT[c]} Your report was not sent; please write it again below.`
                  : `${ERROR_TEXT[c]} Your report was not sent.`}
            </p>
          </div>
        ))}

      {status.kind === 'sent' ? (
        <section className={styles.sent} aria-labelledby={id('sent-h')}>
          <SentNote headingId={id('sent-h')} headingRef={sentRef} page={status.page} replyTo={status.replyTo} onAgain={again} />
        </section>
      ) : (
        <form
          ref={formRef}
          className={styles.sheet}
          action="/api/corrections"
          method="post"
          noValidate={enhanced}
          onSubmit={submit}
          aria-labelledby={id('title')}
          aria-busy={sending || undefined}
        >
          <header className={styles.head}>
            <h3 id={id('title')} className={styles.title}>
              Report an error
            </h3>
            <p className={styles.headNote}>
              <span>Sent by email</span>
              <span aria-hidden="true">·</span>
              <span>not stored here</span>
            </p>
          </header>

          {failed ? (
            <div ref={statusRef} tabIndex={-1} className={styles.notice} data-tone={notConfigured ? 'off' : 'warn'} role="alert">
              <p className={styles.noticeTitle}>{failed.title}</p>
              <p>{failed.body}</p>
              {notConfigured && values.message.trim() ? (
                <p className={styles.noticeActions}>
                  <button type="button" className={`btn btn--ghost ${styles.small}`} onClick={copy}>
                    {copied ? 'Copied' : 'Copy what you wrote'}
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset className={styles.fields}>
            <legend className="visually-hidden">Your report</legend>

            <div className={`${styles.field} ${styles.wide}`} data-invalid={errors.message ? '' : undefined}>
              <div className={styles.labelRow}>
                <label htmlFor={id('message')} className={styles.label}>
                  What looks wrong?
                </label>
                <span className={styles.req}>Required</span>
              </div>
              <p id={id('message-hint')} className={styles.hint}>
                A sentence or two is plenty. Quote the line if you can, and say what you think it should say.
              </p>
              <textarea
                id={id('message')}
                name="message"
                className={styles.input}
                rows={6}
                required
                minLength={LIMITS.messageMin}
                maxLength={LIMITS.messageMax}
                value={values.message}
                onChange={set('message')}
                onBlur={blur('message')}
                aria-invalid={errors.message ? true : undefined}
                aria-describedby={describe('message')}
              />
              <span className={styles.meter} aria-hidden="true">
                <span style={{ width: `${Math.min(100, (len / LIMITS.messageMax) * 100)}%` }} />
              </span>
              <div className={styles.under}>
                {errors.message ? (
                  <p id={id('message-err')} className={styles.error}>
                    {errors.message}
                  </p>
                ) : (
                  <span />
                )}
                <p
                  id={id('count')}
                  className={styles.count}
                  data-state={len > LIMITS.messageMax * 0.9 ? 'near' : trimmedLen >= LIMITS.messageMin ? 'ok' : undefined}
                >
                  <span className="visually-hidden">Characters used: </span>
                  {fmt(len)}
                  <span aria-hidden="true"> / </span>
                  <span className="visually-hidden"> of </span>
                  {fmt(LIMITS.messageMax)}
                </p>
              </div>
            </div>

            <div className={`${styles.field} ${styles.left}`}>
              <div className={styles.labelRow}>
                <label htmlFor={id('page')} className={styles.label}>
                  Which page
                </label>
                <span className={styles.opt}>Optional</span>
              </div>
              <p id={id('page-hint')} className={styles.hint}>
                {values.page && enhanced ? 'Filled in from the page you came from.' : 'A link or path, such as /built/1972.'}
              </p>
              <input
                id={id('page')}
                name="page"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                className={`${styles.input} ${styles.mono}`}
                placeholder="/built/1972"
                maxLength={LIMITS.pageMax}
                value={values.page}
                onChange={set('page')}
                aria-describedby={id('page-hint')}
              />
            </div>

            <div className={styles.field} data-invalid={errors.email ? '' : undefined}>
              <div className={styles.labelRow}>
                <label htmlFor={id('email')} className={styles.label}>
                  Your email
                </label>
                <span className={styles.opt}>Optional</span>
              </div>
              <p id={id('email-hint')} className={styles.hint}>
                Only if you would like a reply. Used to answer you, nothing else.
              </p>
              <input
                id={id('email')}
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className={styles.input}
                maxLength={LIMITS.emailMax}
                value={values.email}
                onChange={set('email')}
                onBlur={blur('email')}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describe('email')}
              />
              {errors.email ? (
                <p id={id('email-err')} className={styles.error}>
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className={`${styles.field} ${styles.wide}`} data-invalid={errors.source ? '' : undefined}>
              <div className={styles.labelRow}>
                <label htmlFor={id('source')} className={styles.label}>
                  A source that shows it
                </label>
                <span className={styles.opt}>Optional</span>
              </div>
              <p id={id('source-hint')} className={styles.hint}>
                A link or citation: a recall notice, a code edition, an agency page.
              </p>
              <input
                id={id('source')}
                name="source"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                className={styles.input}
                maxLength={LIMITS.sourceMax}
                value={values.source}
                onChange={set('source')}
                onBlur={blur('source')}
                aria-invalid={errors.source ? true : undefined}
                aria-describedby={describe('source')}
              />
              {errors.source ? (
                <p id={id('source-err')} className={styles.error}>
                  {errors.source}
                </p>
              ) : null}
            </div>

            {/* spam traps: a person never sees or fills these */}
            <div className={styles.trap} aria-hidden="true">
              <label htmlFor={id(HONEYPOT)}>Leave this field empty</label>
              <input id={id(HONEYPOT)} name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
            <input ref={renderedAt} type="hidden" name={RENDERED_AT} defaultValue="" />
          </fieldset>

          <footer className={styles.foot}>
            <button type="submit" className={`btn ${styles.send}`} aria-disabled={sending || undefined}>
              {sending ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  Send the report <span className="arrow" aria-hidden="true">→</span>
                </>
              )}
            </button>
            <p className={styles.fine}>
              Your report goes by email to the people who maintain this site, through an email delivery service, and is
              not stored here. Please leave out personal or sensitive details. <Link href="/privacy#reports">How reports are handled</Link>
            </p>
          </footer>
        </form>
      )}
    </div>
  );
}

function SentNote({
  headingId,
  headingRef,
  page,
  replyTo,
  onAgain,
}: {
  headingId: string;
  headingRef?: Ref<HTMLHeadingElement>;
  page?: string | null;
  replyTo?: boolean;
  onAgain?: () => void;
}) {
  return (
    <>
      <p className={styles.sentStamp} aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6 10.4l2.6 2.6L14.2 7.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        Received
      </p>
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className={styles.sentTitle}>
        Thank you. Your report is on its way.
      </h3>
      <ol className={styles.next}>
        <li>
          <strong>We reopen the source</strong> it concerns, and any you sent, and compare it word for word with the page.
        </li>
        <li>
          <strong>If the page is wrong, we fix it</strong> everywhere it appears, and list material corrections on this page
          with the date.
        </li>
        <li>
          {replyTo === false ? (
            <>
              <strong>Nothing more to do.</strong> You did not leave an email address, so we cannot write back.
            </>
          ) : replyTo ? (
            <>
              <strong>We may write back</strong> to the address you gave if we have a question or once it is fixed.
            </>
          ) : (
            <>
              <strong>If you left an email address,</strong> we may write back with a question or once it is fixed.
            </>
          )}
        </li>
      </ol>
      <p className={styles.sentActions}>
        {page ? (
          <Link href={page} className="btn btn--ghost">
            <span className="arrow" aria-hidden="true">
              ←
            </span>{' '}
            Back to the page
          </Link>
        ) : null}
        {onAgain ? (
          <button type="button" className="btn btn--ghost" onClick={onAgain}>
            Report something else
          </button>
        ) : (
          <a href="/corrections#report" className="btn btn--ghost">
            Report something else
          </a>
        )}
      </p>
    </>
  );
}
