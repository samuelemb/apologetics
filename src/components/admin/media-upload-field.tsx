"use client";

import {
  FileText,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { discardPendingMediaAction } from "@/app/admin/(protected)/media/actions";
import { Button } from "@/components/ui/button";
import {
  formatFileSize,
  MEDIA_UPLOAD_RULES,
  type MediaUploadEndpoint,
  validateUploadCandidate,
} from "@/config/uploads";
import { MediaAssetStatus, type MediaAssetKind } from "@/generated/prisma/enums";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";
import type { MediaFormAsset } from "@/types/media";

type MediaUploadFieldProps = {
  endpoint: MediaUploadEndpoint;
  kind: MediaAssetKind;
  label: string;
  value: MediaFormAsset | null;
  onChange: (asset: MediaFormAsset | null) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  appearance?: "default" | "news-cover" | "event-cover";
};

export function MediaUploadField({
  endpoint,
  kind,
  label,
  value,
  onChange,
  onBusyChange,
  disabled = false,
  appearance = "default",
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [isDiscarding, setIsDiscarding] = useState(false);
  const { startUpload, isUploading } = useUploadThing(endpoint, {
    uploadProgressGranularity: "fine",
    onUploadProgress: setProgress,
    onClientUploadComplete: (files) => {
      const result = files[0]?.serverData;
      const asset = result?.asset;
      if (!asset) {
        setError(
          result?.error ??
            "The upload completed without valid asset metadata.",
        );
        setProgress(0);
        return;
      }
      onChange(asset);
      setProgress(100);
      setError(undefined);
    },
    onUploadError: () => {
      setError("The upload could not be completed. Check the file and try again.");
      setProgress(0);
    },
  });
  const isBusy = isUploading || isDiscarding;

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  async function discardPendingValue(): Promise<boolean> {
    if (!value || value.status !== MediaAssetStatus.PENDING) return true;

    setIsDiscarding(true);
    const result = await discardPendingMediaAction(value.id);
    setIsDiscarding(false);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function handleSelection(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setError(undefined);
    const validationError = validateUploadCandidate(kind, file);
    if (validationError) {
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!(await discardPendingValue())) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setProgress(0);
    await startUpload([file]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeValue() {
    setError(undefined);
    if (!(await discardPendingValue())) return;
    onChange(null);
    setProgress(0);
  }

  const rule = MEDIA_UPLOAD_RULES[kind];
  const isImage = kind !== "MAGAZINE_PDF";

  if (appearance === "news-cover" || appearance === "event-cover") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-admin-text">{label}</p>

        {value ? (
          <div className="overflow-hidden rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface">
            <div className="relative aspect-[16/7] min-h-48 bg-admin-background">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value.url}
                  alt="Selected upload preview"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-admin-muted-text">
                  <FileText className="size-12" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-admin-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-admin-text">
                  {value.originalName}
                </p>
                <p className="mt-0.5 text-xs text-admin-muted-text">
                  {formatFileSize(value.sizeBytes)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={rule.accept}
                    className="peer sr-only"
                    disabled={disabled || isBusy}
                    onChange={(event) =>
                      void handleSelection(event.target.files)
                    }
                  />
                  <span
                    className={cn(
                      "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface px-3 text-sm font-semibold text-admin-text transition-colors hover:border-admin-primary/40 hover:bg-admin-primary-soft hover:text-admin-primary peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-admin-primary/25 peer-focus-visible:ring-offset-2",
                      (disabled || isBusy) &&
                        "pointer-events-none opacity-50",
                    )}
                    aria-disabled={disabled || isBusy}
                  >
                    {isUploading ? (
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw className="size-4" aria-hidden="true" />
                    )}
                    Replace
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 border-red-200 text-admin-danger hover:bg-red-50 hover:text-admin-danger"
                  disabled={disabled || isBusy}
                  onClick={() => void removeValue()}
                >
                  {isDiscarding ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 aria-hidden="true" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <label className={cn((disabled || isBusy) && "pointer-events-none")}>
            <input
              ref={inputRef}
              type="file"
              accept={rule.accept}
              className="peer sr-only"
              disabled={disabled || isBusy}
              onChange={(event) => void handleSelection(event.target.files)}
            />
            <span
              className={cn(
                "flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[var(--admin-radius)] border border-dashed border-admin-border bg-admin-background/50 px-5 py-8 text-center transition-colors hover:border-admin-primary/50 hover:bg-admin-primary-soft/40 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-admin-primary/25 peer-focus-visible:ring-offset-2",
                (disabled || isBusy) && "opacity-50",
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-admin-primary-soft text-admin-primary">
                {isUploading ? (
                  <LoaderCircle
                    className="size-6 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ImageIcon className="size-6" aria-hidden="true" />
                )}
              </span>
              <span className="mt-4 text-sm font-semibold text-admin-text">
                {isUploading ? "Uploading cover image" : "Choose a cover image"}
              </span>
              <span className="mt-1 max-w-sm text-xs leading-5 text-admin-muted-text">
                JPEG, PNG, or WebP up to {formatFileSize(rule.maximumBytes)}.
              </span>
              <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--admin-radius)] bg-admin-primary px-4 text-sm font-semibold text-white shadow-sm">
                <Upload className="size-4" aria-hidden="true" />
                Browse files
              </span>
            </span>
          </label>
        )}

        {isUploading && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-admin-background">
              <div
                className="h-full rounded-full bg-admin-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-admin-muted-text">
              Uploading {progress}%
            </p>
          </div>
        )}
        {error && (
          <p className="text-sm font-medium text-admin-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <label>
          <input
            ref={inputRef}
            type="file"
            accept={rule.accept}
            className="sr-only"
            disabled={disabled || isBusy}
            onChange={(event) => void handleSelection(event.target.files)}
          />
          <span
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={disabled || isBusy}
          >
            {isUploading ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            {value ? "Replace" : "Upload"}
          </span>
        </label>
      </div>

      {value && (
        <div className="flex min-h-24 items-center gap-3 rounded-md border bg-muted/30 p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.url}
              alt="Selected upload preview"
              className="size-20 shrink-0 rounded object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded bg-background text-muted-foreground">
              <FileText className="size-8" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.originalName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.sizeBytes)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Remove upload"
            aria-label="Remove upload"
            disabled={disabled || isBusy}
            onClick={() => void removeValue()}
          >
            {isDiscarding ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Trash2 />
            )}
          </Button>
        </div>
      )}

      {isUploading && (
        <div className="space-y-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading {progress}%</p>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
