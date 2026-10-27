import type { ReactNode, SVGProps } from "react";

// Trazo de "tubo de neón": grueso y redondeado, como el rótulo.
const scissors = (
  <>
    <path d="M12.4 11.6Q9 7 6.8 2.6Q8.2 7.6 11.2 12.4" />
    <path d="M11.6 11.6Q15 7 17.2 2.6Q15.8 7.6 12.8 12.4" />
    <path d="M11.4 12.6l2.6 3.6M12.6 12.6L10 16.2" />
    <circle cx="15.4" cy="18.4" r="2.1" />
    <circle cx="8.6" cy="18.4" r="2.1" />
  </>
);

const glyphs = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />,
  share: (
    <path d="M12 4v11M7.5 8.5L12 4l4.5 4.5M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" />
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  refresh: <path d="M20 12a8 8 0 11-2.4-5.7M20 4v5h-5" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  star: (
    <path d="M12 3.5l2.5 5.3 5.7.7-4.2 3.9 1.1 5.7L12 16.3l-5.1 2.8 1.1-5.7-4.2-3.9 5.7-.7z" />
  ),
  scissors,
  // «AV» del corte atemporal vintage, con su estrella.
  av: (
    <>
      <path d="M2.5 20.5L8 6l5.5 14.5L18.5 8" />
      <path d="M5 15h6" />
      <path d="M20.5 2q.4 2.1 2.5 2.5q-2.1.4-2.5 2.5q-.4-2.1-2.5-2.5q2.1-.4 2.5-2.5z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof glyphs;

export function Icon({
  name,
  glow = false,
  className = "size-5",
  ...props
}: { name: IconName; glow?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${glow ? "drop-shadow-[0_0_4px_currentColor]" : ""} ${className}`}
      {...props}
    >
      {glyphs[name]}
    </svg>
  );
}
