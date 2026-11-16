'use client';

/** Opens the browser's print dialog. Rendered only where printing makes sense (the checklist). */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={`btn ${className ?? ''}`} onClick={() => window.print()}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" focusable="false">
        <path d="M5 6V2h8v4M5 13H2.5V6.5h13V13H13" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 10.5h8V16H5z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M13 8.5h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      Print this sheet
    </button>
  );
}

export default PrintButton;
