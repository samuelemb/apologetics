import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PublicLinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "text";
  size?: "sm" | "md";
  className?: string;
};

const variantClasses: Record<
  NonNullable<PublicLinkButtonProps["variant"]>,
  string
> = {
  primary:
    "border-transparent bg-public-primary text-white shadow-sm hover:bg-public-primary-hover",
  secondary:
    "border-public-border bg-public-surface text-public-text shadow-[var(--public-shadow)] hover:border-public-primary/35 hover:bg-public-primary-soft hover:text-public-primary",
  text: "border-transparent bg-transparent text-public-primary hover:text-public-primary-hover hover:underline hover:underline-offset-4",
};

const sizeClasses: Record<
  NonNullable<PublicLinkButtonProps["size"]>,
  string
> = {
  sm: "min-h-10 px-3.5 text-sm",
  md: "min-h-11 px-5 text-sm",
};

export function PublicLinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: PublicLinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-2 rounded-[var(--public-radius)] border font-semibold leading-5 transition-[background-color,border-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      <span className="min-w-0 break-words text-center">{children}</span>
    </Link>
  );
}
