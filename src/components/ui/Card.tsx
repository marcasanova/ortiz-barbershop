import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-panel border border-brick-edge bg-brick p-4 ${className}`}
      {...props}
    />
  );
}
