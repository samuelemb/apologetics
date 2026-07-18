import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-listing";
import { EventForm } from "@/components/admin/event-form";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { canCreateEvent } from "@/lib/event-policy";
import { cn } from "@/lib/utils";
import { getEventFormOptions } from "@/services/event.service";

export default async function NewEventPage() {
  const user = await requireAdmin();
  if (!canCreateEvent(user.role)) {
    redirect("/admin/events?error=forbidden");
  }
  const options = await getEventFormOptions();

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
        title="New event"
        description="Create a draft, schedule publication, or publish an event now."
      />
      <EventForm
        role={user.role}
        categories={options.categories}
        tags={options.tags}
      />
    </div>
  );
}
