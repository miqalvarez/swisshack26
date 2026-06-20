/**
 * The Polaris mark — north star + compass needle + horizon arc — recreated as
 * clean vector line-art. Uses currentColor so it can be tinted (SIX red, white,
 * ink) via the surrounding text color.
 */
export function PolarisMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* horizon arc / wings */}
      <path
        d="M19 69 C22 46 36 43 50 43 C64 43 78 46 81 69"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* compass needle / blade */}
      <path
        d="M50 26 L59 62 L50 85 L41 62 Z"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      {/* centre ridge */}
      <path
        d="M50 27 L50 84"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      {/* north star */}
      <path
        d="M50 6 L51.7 12.3 L58 14 L51.7 15.7 L50 22 L48.3 15.7 L42 14 L48.3 12.3 Z"
        fill="currentColor"
      />
    </svg>
  )
}
