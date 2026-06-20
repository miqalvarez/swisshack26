/**
 * The Polaris mark — a compass needle pointing up to the north star — as clean
 * vector line-art. Uses currentColor so it can be tinted (SIX red, white, ink)
 * via the surrounding text color.
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
      {/* compass needle pointing up to the star */}
      <path
        d="M50 28 L60 66 L50 90 L40 66 Z"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      {/* centre ridge */}
      <path
        d="M50 29 L50 90"
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
