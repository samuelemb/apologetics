"use client";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { toggleContentLikeAction } from "@/app/(public)/content-like-actions";
import { ContentType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type PublicNewsEngagementProps = {
  articleId: string;
  slug: string;
  title: string;
  initialLikeCount: number;
  initialLiked: boolean;
  commentCount: number;
  compact?: boolean;
};

export function PublicNewsEngagement({
  articleId,
  slug,
  title,
  initialLikeCount,
  initialLiked,
  commentCount,
  compact = false,
}: PublicNewsEngagementProps) {
  const { data: session, status } = useSession();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const isPublicUser = status === "authenticated" && session.user?.role === "USER";
  const articleHref = `/news/${slug}`;
  const controlClass = cn(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--public-radius)] px-2.5 text-xs font-semibold text-public-muted-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-public-primary",
    compact ? "flex-1" : "sm:px-3",
  );

  async function toggleLike() {
    setPending(true);
    setMessage(undefined);
    const result = await toggleContentLikeAction({
      contentType: ContentType.NEWS,
      contentId: articleId,
    });
    setPending(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setLiked(result.liked);
    setLikeCount(result.count);
  }

  async function shareArticle() {
    const url = new URL(articleHref, window.location.origin).toString();
    setMessage(undefined);

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setMessage("Unable to share this article.");
    }
  }

  return (
    <div className="border-t border-public-border px-2 py-2">
      <div className="flex items-center justify-between gap-1">
        {isPublicUser ? (
          <button
            type="button"
            onClick={toggleLike}
            disabled={pending}
            aria-pressed={liked}
            aria-label={liked ? `Unlike ${title}` : `Like ${title}`}
            className={controlClass}
          >
            <Heart className={liked ? "size-4 fill-public-primary text-public-primary" : "size-4"} aria-hidden="true" />
            <span>{likeCount}</span>
          </button>
        ) : (
          <Link href="/login" aria-label={`Sign in to like ${title}`} className={controlClass}>
            <Heart className="size-4" aria-hidden="true" />
            <span>{likeCount}</span>
          </Link>
        )}
        <Link href={`${articleHref}#comments`} aria-label={`View comments for ${title}`} className={controlClass}>
          <MessageCircle className="size-4" aria-hidden="true" />
          <span>{commentCount}</span>
        </Link>
        <button type="button" onClick={shareArticle} aria-label={`Share ${title}`} className={controlClass}>
          <Share2 className="size-4" aria-hidden="true" />
          <span>Share</span>
        </button>
      </div>
      {message ? <p role="status" className="mt-1 px-1 text-center text-xs text-public-muted-text">{message}</p> : null}
    </div>
  );
}
