"use client";

import { CircleCheck, CircleOff, LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  deleteCategoryAction,
  setCategoryActiveAction,
} from "@/app/admin/(protected)/categories/actions";
import { Button } from "@/components/ui/button";

type CategoryRowActionsProps = {
  id: string;
  name: string;
  isActive: boolean;
  canDelete: boolean;
};

export function CategoryRowActions({
  id,
  name,
  isActive,
  canDelete,
}: CategoryRowActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"status" | "delete">();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  async function toggleActive() {
    setPending("status");
    setError(undefined);
    const result = await setCategoryActiveAction(id, !isActive);
    setPending(undefined);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function confirmDelete() {
    setPending("delete");
    setError(undefined);
    const result = await deleteCategoryAction(id);
    setPending(undefined);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 rounded-md"
        disabled={Boolean(pending)}
        onClick={toggleActive}
      >
        {pending === "status" ? (
          <LoaderCircle className="animate-spin" />
        ) : isActive ? (
          <CircleOff />
        ) : (
          <CircleCheck />
        )}
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-10 rounded-md"
          disabled={Boolean(pending)}
          onClick={() => {
            setError(undefined);
            setConfirming(true);
          }}
          aria-label={`Delete ${name}`}
        >
          <Trash2 />
          Delete
        </Button>
      )}
      {error && !confirming && (
        <p className="w-full text-right text-xs text-destructive" role="alert">{error}</p>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setConfirming(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-category-title-${id}`}
            aria-describedby={`delete-category-description-${id}`}
            className="w-full max-w-md rounded-md border bg-background p-5 shadow-xl"
          >
            <h2 id={`delete-category-title-${id}`} className="text-lg font-semibold">
              Delete category
            </h2>
            <p id={`delete-category-description-${id}`} className="mt-2 text-sm text-muted-foreground">
              Permanently delete &quot;{name}&quot;? Categories in use cannot be deleted.
            </p>
            {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={Boolean(pending)} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={Boolean(pending)} onClick={confirmDelete}>
                {pending === "delete" ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {pending === "delete" ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
