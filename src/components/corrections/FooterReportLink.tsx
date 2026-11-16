'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { reportErrorHref } from '@/lib/contact';
import { ReportGlyph } from './ReportErrorLink';

/** Pages where "Report an error on this page" makes no sense (the form itself and the policies). */
const SKIP = new Set(['/corrections', '/privacy', '/terms']);

/** "Report an error on this page" in the footer's policy strip, for whatever page is showing. */
export function FooterReportLink({ className }: { className?: string }) {
  const path = usePathname();
  if (!path || SKIP.has(path)) return null;
  return (
    <Link href={reportErrorHref(path)} className={className} prefetch={false}>
      <ReportGlyph />
      Report an error on this page
    </Link>
  );
}
