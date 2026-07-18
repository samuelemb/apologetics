import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export function PublicCard({
  children,
  className,
  interactive = false,
}: PublicCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-[var(--public-radius)] border border-public-border bg-public-surface shadow-[var(--public-shadow)]",
        interactive &&
          "transition-[border-color,box-shadow] hover:border-public-primary/30 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
