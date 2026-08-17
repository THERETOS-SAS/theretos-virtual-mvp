import type { ReactNode } from "react";

export function GameViewport({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return <div className={`game-runtime-viewport ${className}`} role="group" aria-label={label}>{children}</div>;
}
