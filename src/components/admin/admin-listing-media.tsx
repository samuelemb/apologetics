"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Newspaper,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ThumbnailKind = "news" | "event" | "magazine";

const thumbnailIcons = {
  news: Newspaper,
  event: CalendarDays,
  magazine: BookOpen,
};

export function AdminThumbnail({
  src,
  alt,
  kind,
  className,
}: {
  src?: string | null;
  alt: string;
  kind: ThumbnailKind;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = thumbnailIcons[kind];
  const failed = Boolean(src && failedSrc === src);

  return (
    <span
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-admin-primary-soft text-admin-primary",
        className,
      )}
    >
      {src && !failed ? (
        // Existing media URLs may be local uploads or externally hosted assets.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <Icon aria-hidden="true" className="size-5" />
      )}
    </span>
  );
}

export function AdminAvatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-admin-background text-sm font-semibold text-admin-muted-text",
        className,
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} profile photo`}
          className="size-full object-cover"
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <UserRound aria-hidden="true" className="size-5" />
      )}
    </span>
  );
}
