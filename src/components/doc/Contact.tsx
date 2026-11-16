import Link from 'next/link';
import { SITE } from '@/lib/site';

/**
 * How to reach the maintainers: a mailto link when SITE.contactEmail is set, else the corrections
 * form when SITE.contactForm is on (the owner stays anonymous), else an honest placeholder.
 * `lead` is the sentence before an address, e.g. "Write to".
 */
export function Contact({ lead = 'Write to' }: { lead?: string }) {
  if (SITE.contactEmail) {
    return (
      <>
        {lead} <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </>
    );
  }
  if (SITE.contactForm) {
    return (
      <>
        Use the <Link href="/corrections#report">form on the corrections page</Link>.
      </>
    );
  }
  return <>A contact address will be listed here shortly.</>;
}
