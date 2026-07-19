"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PublicContentImageProps = {
  src?: string | null;
  alt: string;
  loading?: "eager" | "lazy";
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

type ImageStatus = "loading" | "loaded" | "failed";

export function PublicContentImage({
  src,
  alt,
  loading = "lazy",
  className,
  imageClassName,
  fallbackClassName,
}: PublicContentImageProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<ImageStatus>(
    normalizedSrc ? "loading" : "failed",
  );

  useEffect(() => {
    if (!normalizedSrc) {
      setStatus("failed");
      return;
    }

    setStatus("loading");

    const image = imageRef.current;

    if (!image?.complete) {
      return;
    }

    setStatus(image.naturalWidth > 0 ? "loaded" : "failed");
  }, [normalizedSrc]);

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden bg-public-primary-soft",
        className,
      )}
    >
      {status !== "loaded" ? (
        <div
          role={status === "failed" ? "img" : undefined}
          aria-label={
            status === "failed" ? `${alt} — image unavailable` : undefined
          }
          aria-hidden={status === "loading" ? "true" : undefined}
          className={cn(
            "absolute inset-0 flex items-center justify-center text-public-muted-text",
            fallbackClassName,
          )}
        >
          <ImageIcon aria-hidden="true" className="size-9 opacity-60" />
        </div>
      ) : null}

      {normalizedSrc && status !== "failed" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={normalizedSrc}
          ref={imageRef}
          src={normalizedSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={(event) => {
            if (event.currentTarget === imageRef.current) {
              setStatus("loaded");
            }
          }}
          onError={(event) => {
            if (event.currentTarget === imageRef.current) {
              setStatus("failed");
            }
          }}
          className={cn(
            "absolute inset-0 size-full",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imageClassName,
          )}
        />
      ) : null}
    </div>
  );
}
