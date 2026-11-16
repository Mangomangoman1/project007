/** The mark: a gable section drawn in line, with a dimension line beneath. Inherits currentColor. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 13 L14 4.5 L24 13" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="miter" />
      <path d="M7 11 V21 H21 V11" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 21 V16 H16 V21" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 25 H24 M4 23.5 V26.5 M24 23.5 V26.5" stroke="currentColor" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}
