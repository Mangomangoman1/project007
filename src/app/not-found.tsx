import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap" style={{ paddingTop: 'var(--s-9)', display: 'grid', gap: 'var(--s-4)' }}>
      <p className="label">404 · Not on the drawings</p>
      <h1 style={{ fontSize: 'var(--t-2xl)' }}>This page isn&rsquo;t on the plans.</h1>
      <p className="lede measure">The link may be wrong, or the page may not exist yet.</p>
      <p>
        <Link href="/" className="btn">
          Look up a year <span className="arrow" aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
