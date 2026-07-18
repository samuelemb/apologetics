import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { EventForm } from "@/components/admin/event-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canEditEvent } from "@/lib/event-policy";
import { cn } from "@/lib/utils";
import {
  getEventForEdit,
  getEventFormOptions,
} from "@/services/event.service";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const event = await getEventForEdit(id);

  if (!event) {
    notFound();
  }
  if (!canEditEvent(user.role, user.id, event.authorId)) {
    redirect("/admin/events?error=forbidden");
  }
  const options = await getEventFormOptions({
    categoryId: event.categoryId || undefined,
    tagIds: event.tagIds,
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <Link
        href="/admin/events"
        className={cn(
          buttonVariants({ variant: "ghost", size: "lg" }),
          "-ml-3 h-10 text-admin-muted-text",
        )}
      >
        <ArrowLeft aria-hidden="true" />
        Back to events
      </Link>
      <AdminPageHeader
        title="Edit event"
        description="Update event details, taxonomy, and publication status."
      />
      <EventForm
        role={user.role}
        categories={options.categories}
        tags={options.tags}
        event={event}
      />
    </div>
  );
}
