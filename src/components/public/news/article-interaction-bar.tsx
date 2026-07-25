"use client";

import { Bookmark, Heart, LoaderCircle, LockKeyhole, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { toggleContentBookmarkAction } from "@/app/(public)/content-bookmark-actions";
import { toggleContentLikeAction } from "@/app/(public)/content-like-actions";
import { ContentType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type ArticleInteractionBarProps = {
  articleId: string;
  slug: string;
  title: string;
  initialLikeCount: number;
  initialLiked: boolean;
  initialSaved: boolean;
  commentCount: number;
};

export function ArticleInteractionBar({ articleId, slug, title, initialLikeCount, initialLiked, initialSaved, commentCount }: ArticleInteractionBarProps) {
  const { data: session, status } = useSession();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [message, setMessage] = useState<string>();
  const isPublicUser = status === "authenticated" && session.user?.role === "USER";
  const articleHref = `/news/${slug}`;

  async function toggleLike() {
    setLikePending(true); setMessage(undefined);
    const result = await toggleContentLikeAction({ contentType: ContentType.NEWS, contentId: articleId });
    setLikePending(false);
    if (!result.ok) return setMessage(result.message);
    setLiked(result.liked); setLikeCount(result.count);
  }

  async function toggleSave() {
    setSavePending(true); setMessage(undefined);
    const result = await toggleContentBookmarkAction({ contentType: ContentType.NEWS, contentId: articleId });
    setSavePending(false);
    if (!result.ok) return setMessage(result.message);
    setSaved(result.saved); setMessage(result.saved ? "Article saved." : "Article removed from saved items.");
  }

  async function shareArticle() {
    const url = new URL(articleHref, window.location.origin).toString();
    setMessage(undefined);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setMessage("Article link copied."); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Unable to share this article.");
    }
  }

  const itemClass = "flex min-h-16 min-w-0 items-center justify-center gap-2 px-3 font-editorial text-base font-bold text-public-text transition-colors hover:bg-public-primary-soft hover:text-public-primary focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-public-primary sm:min-h-20 sm:gap-3 sm:text-xl";

  const signIn = () => window.location.assign(`/login?callbackUrl=${encodeURIComponent(articleHref)}`);

  return <section className="mt-8" aria-label="Article interactions"><div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-public-border bg-public-surface shadow-[var(--public-shadow)] sm:grid-cols-4"><button type="button" onClick={isPublicUser ? toggleLike : signIn} disabled={likePending || status === "loading"} aria-pressed={liked} className={cn(itemClass, "border-b border-r border-public-border sm:border-b-0")}><Heart className={cn("size-6 text-public-primary sm:size-7", liked && "fill-public-primary")} aria-hidden="true" />Like <span className="rounded-full bg-public-primary-soft px-2.5 py-1 font-sans text-sm font-bold text-public-primary">{likePending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : likeCount}</span></button><Link href="#comments" className={cn(itemClass, "border-b border-public-border sm:border-b-0 sm:border-r")}><MessageCircle className="size-6 sm:size-7" aria-hidden="true" />Comments <span className="rounded-full bg-public-primary-soft px-2.5 py-1 font-sans text-sm font-bold text-public-primary">{commentCount}</span></Link><button type="button" onClick={isPublicUser ? toggleSave : signIn} disabled={savePending || status === "loading"} aria-pressed={saved} className={cn(itemClass, "border-r border-public-border")} >{savePending ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : <Bookmark className={cn("size-6 sm:size-7", saved && "fill-public-primary text-public-primary")} aria-hidden="true" />}{saved ? "Saved" : "Save"}</button><button type="button" onClick={shareArticle} className={itemClass}><Share2 className="size-6 sm:size-7" aria-hidden="true" />Share</button></div>{!isPublicUser && status !== "loading" ? <p className="mt-4 flex items-center gap-2 text-sm text-public-muted-text sm:text-base"><LockKeyhole className="size-5 shrink-0 text-public-muted-text/60" aria-hidden="true" /><Link href={`/login?callbackUrl=${encodeURIComponent(articleHref)}`} className="font-bold text-public-primary hover:underline">Sign in</Link> to like, save, or comment on this article.</p> : null}{message ? <p role="status" className="mt-3 text-sm text-public-muted-text">{message}</p> : null}</section>;
}
