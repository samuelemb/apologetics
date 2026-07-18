"use client";

import {
  CircleCheck,
  CircleOff,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  deleteUserAction,
  setUserStatusAction,
} from "@/app/admin/(protected)/users/actions";
import { Button } from "@/components/ui/button";
import { UserStatus } from "@/generated/prisma/enums";

type UserRowActionsProps = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  canChangeStatus: boolean;
  canDelete: boolean;
};

export function UserRowActions({
  id,
  name,
  email,
  status,
  canChangeStatus,
  canDelete,
}: UserRowActionsProps) {
  const [pending, setPending] = useState<"status" | "delete">();
  const [confirming, setConfirming] = useState<"suspend" | "delete">();
  const [error, setError] = useState<string>();

  async function changeStatus(nextStatus: typeof UserStatus.ACTIVE | typeof UserStatus.SUSPENDED) {
    setPending("status");
    setError(undefined);
    const result = await setUserStatusAction(id, nextStatus);
    setPending(undefined);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(undefined);
    window.location.reload();
  }

  async function confirmDelete() {
    setPending("delete");
    setError(undefined);
    const result = await deleteUserAction(id);
    setPending(undefined);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setConfirming(undefined);
    window.location.reload();
  }

  const hasActions =
    (canChangeStatus && status !== UserStatus.INVITED) || canDelete;

  if (!hasActions) {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  return (
    <>
      {canChangeStatus && status === UserStatus.ACTIVE && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-md"
          disabled={Boolean(pending)}
          onClick={() => {
            setError(undefined);
            setConfirming("suspend");
          }}
          aria-label={`Suspend ${name}`}
        >
          <CircleOff />
          Suspend
        </Button>
      )}
      {canChangeStatus && status === UserStatus.SUSPENDED && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 rounded-md"
          disabled={Boolean(pending)}
          onClick={() => changeStatus(UserStatus.ACTIVE)}
          aria-label={`Reactivate ${name}`}
        >
          {pending === "status" ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <CircleCheck />
          )}
          {pending === "status" ? "Reactivating..." : "Reactivate"}
        </Button>
      )}
      {canDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-10 rounded-md"
          disabled={Boolean(pending)}
          onClick={() => {
            setError(undefined);
            setConfirming("delete");
          }}
          aria-label={`Delete ${name}`}
        >
          <Trash2 />
          Delete
        </Button>
      )}
      {error && !confirming && (
        <p className="w-full text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setConfirming(undefined);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`user-confirm-title-${id}`}
            aria-describedby={`user-confirm-description-${id}`}
            className="w-full max-w-md rounded-md border bg-background p-5 shadow-xl"
          >
            <h2 id={`user-confirm-title-${id}`} className="text-lg font-semibold">
              {confirming === "suspend" ? "Suspend user" : "Delete user permanently"}
            </h2>
            <div
              id={`user-confirm-description-${id}`}
              className="mt-2 space-y-2 text-sm text-muted-foreground"
            >
              <p>
                {confirming === "suspend"
                  ? "This account will lose admin access immediately on its next protected request."
                  : "This account will be permanently removed. Authored content will remain and its author will become unassigned."}
              </p>
              <p>
                <span className="font-medium text-foreground">{name}</span>
                <br />
                {email}
              </p>
            </div>
            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(pending)}
                onClick={() => setConfirming(undefined)}
              >
                Cancel
              </Button>
              {confirming === "suspend" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={Boolean(pending)}
                  onClick={() => changeStatus(UserStatus.SUSPENDED)}
                >
                  {pending === "status" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <CircleOff />
                  )}
                  {pending === "status" ? "Suspending..." : "Suspend user"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={Boolean(pending)}
                  onClick={confirmDelete}
                >
                  {pending === "delete" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                  {pending === "delete" ? "Deleting..." : "Delete permanently"}
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
