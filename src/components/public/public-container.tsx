import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PublicContainer({
  children,
  className,
}: PublicContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1280px] px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
