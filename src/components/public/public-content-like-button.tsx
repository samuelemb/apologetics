"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { toggleContentLikeAction } from "@/app/(public)/content-like-actions";
import type { ContentLikeInput } from "@/schemas/content-like";

type PublicContentLikeButtonProps = ContentLikeInput & {
  initialCount: number;
  initialLiked: boolean;
};

export function PublicContentLikeButton({
  contentType,
  contentId,
  initialCount,
  initialLiked,
}: PublicContentLikeButtonProps) {
  const { data: session, status } = useSession();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const isPublicUser = status === "authenticated" && session.user?.role === "USER";

  async function toggleLike() {
    setPending(true);
    setError(undefined);
    const result = await toggleContentLikeAction({ contentType, contentId });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setLiked(result.liked);
    setCount(result.count);
  }

  if (!isPublicUser) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-public-muted-text"><Heart className="size-5 text-public-primary" aria-hidden="true" />{count} {count === 1 ? "like" : "likes"}</span>
        <Link href="/login" className="text-sm font-semibold text-public-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary">Sign in to like</Link>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={toggleLike} disabled={pending} aria-pressed={liked} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--public-radius)] border border-public-border bg-public-surface px-4 text-sm font-bold text-public-text transition-colors hover:border-public-primary/40 hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary disabled:opacity-60"><Heart className={liked ? "size-5 fill-public-primary text-public-primary" : "size-5 text-public-primary"} aria-hidden="true" />{pending ? "Saving..." : liked ? "Liked" : "Like"}<span className="font-medium text-public-muted-text">{count}</span></button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
