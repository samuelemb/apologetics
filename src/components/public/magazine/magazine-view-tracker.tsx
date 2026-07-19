"use client";

import { useEffect, useRef } from "react";

type MagazineViewTrackerProps = {
  slug: string;
};

export function MagazineViewTracker({ slug }: MagazineViewTrackerProps) {
  const trackedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug || trackedSlugRef.current === slug) {
      return;
    }

    trackedSlugRef.current = slug;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/public/magazine/${encodeURIComponent(slug)}/view`, {
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
