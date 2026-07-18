import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicSectionHeadingProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export function PublicSectionHeading({
  title,
  description,
  eyebrow,
  action,
  className,
}: PublicSectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 break-words text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="break-words font-editorial text-2xl font-bold leading-tight text-public-text sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-public-muted-text sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center sm:shrink-0 sm:justify-end">
          {action}
        </div>
      ) : null}
    </header>
  );
}
