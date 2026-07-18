"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteMagazineAction } from "@/app/admin/(protected)/magazine/actions";
import { Button } from "@/components/ui/button";

type DeleteMagazineButtonProps = {
  id: string;
  title: string;
  issueNumber: string;
};

export function DeleteMagazineButton({
  id,
  title,
  issueNumber,
}: DeleteMagazineButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    setDeleting(true);
    setError(undefined);
    const result = await deleteMagazineAction(id);
    setDeleting(false);

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
        variant="destructive"
        size="sm"
        className="h-10 rounded-md"
        disabled={deleting}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${title}, issue ${issueNumber}`}
      >
        <Trash2 />
        Delete
      </Button>
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget && !deleting) {
              setConfirming(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-magazine-title-${id}`}
            aria-describedby={`delete-magazine-description-${id}`}
            className="w-full max-w-md rounded-md border bg-background p-5 shadow-xl"
          >
            <h2 id={`delete-magazine-title-${id}`} className="text-lg font-semibold">
              Delete magazine issue
            </h2>
            <p id={`delete-magazine-description-${id}`} className="mt-2 text-sm text-muted-foreground">
              Delete &quot;{title}&quot;, issue {issueNumber}? This permanently removes the issue and its tag links.
            </p>
            {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={deleting} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
