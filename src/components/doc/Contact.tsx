import { SITE } from '@/lib/site';

/**
 * The contact address, or an honest placeholder while none is set (SITE.contactEmail).
 * `lead` is the sentence before it when an address exists, e.g. "Write to".
 */
export function Contact({ lead = 'Write to' }: { lead?: string }) {
  if (!SITE.contactEmail) return <>A contact address will be listed here shortly.</>;
  return (
    <>
      {lead} <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
    </>
  );
}
