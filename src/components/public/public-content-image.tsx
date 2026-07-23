"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";

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

  return (
    <PublicContentImageState
      key={normalizedSrc}
      src={normalizedSrc}
      alt={alt}
      loading={loading}
      className={className}
      imageClassName={imageClassName}
      fallbackClassName={fallbackClassName}
    />
  );
}

function PublicContentImageState({
  src,
  alt,
  loading,
  className,
  imageClassName,
  fallbackClassName,
}: Required<Pick<PublicContentImageProps, "alt" | "loading">> & Omit<PublicContentImageProps, "src" | "alt" | "loading"> & { src: string }) {
  const [status, setStatus] = useState<ImageStatus>(
    src ? "loading" : "failed",
  );

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

      {src && status !== "failed" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("failed")}
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
