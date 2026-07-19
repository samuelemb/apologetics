"use client";

import { useEffect, useRef } from "react";

type NewsViewTrackerProps = {
  slug: string;
};

export function NewsViewTracker({ slug }: NewsViewTrackerProps) {
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || trackedSlugRef.current === slug) {
      return;
    }

    trackedSlugRef.current = slug;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/public/news/${encodeURIComponent(slug)}/view`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      }).catch(() => undefined);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (trackedSlugRef.current === slug) {
        trackedSlugRef.current = null;
      }
    };
  }, [slug]);

  return null;
}
