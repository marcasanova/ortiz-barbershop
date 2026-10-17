import type { SVGProps } from "react";

const paths = {
  close: "M6 6l12 12M18 6L6 18",
  trash:
    "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5",
  share:
    "M12 4v11M7.5 8.5L12 4l4.5 4.5M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6",
  copy: "M9 9h10v11H9zM5 15V4h10",
  plus: "M12 5v14M5 12h14",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  clock: "M12 7v5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z",
  check: "M5 12.5l4.5 4.5L19 7",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  scissors:
    "M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM8.5 7.5L20 18M8.5 16.5L20 6",
  razor:
    "M3 14h11.5a3.5 3.5 0 000-7H6L3 14zM14.5 14l5.5 3.5M9 10.5h4",
  refresh: "M20 12a8 8 0 11-2.4-5.7M20 4v5h-5",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-5",
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
