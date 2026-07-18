"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarRange,
  FileText,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Save,
  Settings2,
  Tags as TagsIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  createEventAction,
  updateEventAction,
} from "@/app/admin/(protected)/events/actions";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EventStatus,
  MediaAssetKind,
  type UserRole,
} from "@/generated/prisma/enums";
import { canUseEventStatus } from "@/lib/event-policy";
import { cn } from "@/lib/utils";
import {
  eventFormSchema,
  generateEventSlug,
  type EventFormInput,
} from "@/schemas/event";
import type { EventEditValues, EventFormOption } from "@/types/event";

type EventFormProps = {
  role: UserRole;
  categories: EventFormOption[];
  tags: EventFormOption[];
  event?: EventEditValues;
};

const emptyValues: EventFormInput = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  categoryId: "",
  tagIds: [],
  status: EventStatus.DRAFT,
  featured: false,
  startAt: "",
  endAt: "",
  location: "",
  isOnline: false,
  onlineUrl: "",
  registrationUrl: "",
  registrationDeadline: "",
  capacity: "",
  publishedAt: "",
  scheduledFor: "",
};

const controlClass =
  "h-11 rounded-[var(--admin-radius)] border-admin-border bg-admin-surface shadow-none focus-visible:border-admin-primary focus-visible:ring-admin-primary/15";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="break-words text-sm font-medium text-admin-danger">
      {message}
    </p>
  ) : null;
}

function RequiredIndicator() {
  return (
    <>
      <span className="text-admin-danger" aria-hidden="true"> *</span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface shadow-[var(--admin-shadow)]">
      <header className="flex items-start gap-3 border-b border-admin-border px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-admin-primary-soft text-admin-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-admin-text">{title}</h2>
          <p className="mt-0.5 text-sm text-admin-muted-text">{description}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function statusLabel(status: EventStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function EventForm({ role, categories, tags, event }: EventFormProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(event));
  const [formError, setFormError] = useState<string>();
  const [coverAsset, setCoverAsset] = useState(event?.coverImageAsset ?? null);
  const [isMediaBusy, setIsMediaBusy] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? {
          title: event.title,
          slug: event.slug,
          summary: event.summary,
          content: event.content,
          coverImageUrl: event.coverImageUrl,
          coverImageAssetId: event.coverImageAssetId,
          coverImageAlt: event.coverImageAlt,
          categoryId: event.categoryId,
          tagIds: event.tagIds,
          status: event.status,
          featured: event.featured,
          startAt: event.startAt,
          endAt: event.endAt,
          location: event.location,
          isOnline: event.isOnline,
          onlineUrl: event.onlineUrl,
          registrationUrl: event.registrationUrl,
          registrationDeadline: event.registrationDeadline,
          capacity: event.capacity,
          publishedAt: event.publishedAt,
          scheduledFor: event.scheduledFor,
        }
      : emptyValues,
  });
  const titleField = register("title");
  const slugField = register("slug");
  const selectedStatus = useWatch({ control, name: "status" });
  const isOnline = useWatch({ control, name: "isOnline" });
  const allowedStatuses = Object.values(EventStatus).filter((status) =>
    canUseEventStatus(role, status),
  );

  async function onSubmit(values: EventFormInput) {
    setFormError(undefined);
    const result = event
      ? await updateEventAction(event.id, values)
      : await createEventAction(values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) {
          setError(field as keyof EventFormInput, { message });
        }
      });
      return;
    }

    router.push("/admin/events");
    router.refresh();
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      {formError ? (
        <div
          className="rounded-[var(--admin-radius)] border border-admin-danger/25 bg-red-50 px-4 py-3 text-sm font-medium text-admin-danger xl:col-span-2"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <div className="min-w-0 space-y-6">
        <FormSection
          title="Event content"
          description="Add the event title, summary, and full details."
          icon={FileText}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-admin-text">
                Event title<RequiredIndicator />
              </label>
              <Input
                id="title"
                placeholder="Enter event title"
                className={controlClass}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : "title-help"}
                {...titleField}
                onChange={(inputEvent) => {
                  titleField.onChange(inputEvent);
                  if (!slugEdited) {
                    setValue("slug", generateEventSlug(inputEvent.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <p id="title-help" className="text-xs text-admin-muted-text">
                Use a clear and descriptive event name.
              </p>
              <FieldError id="title-error" message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-semibold text-admin-text">
                Slug
              </label>
              <Input
                id="slug"
                placeholder="event-url-slug"
                className={controlClass}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={errors.slug ? "slug-error" : "slug-help"}
                {...slugField}
                onChange={(inputEvent) => {
                  setSlugEdited(true);
                  slugField.onChange(inputEvent);
                }}
              />
              <p id="slug-help" className="text-xs text-admin-muted-text">
                Generated from the title until you edit it.
              </p>
              <FieldError id="slug-error" message={errors.slug?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="summary" className="text-sm font-semibold text-admin-text">
                Short description
              </label>
              <Textarea
                id="summary"
                rows={4}
                placeholder="Write a short description for event listings."
                className="rounded-[var(--admin-radius)] border-admin-border bg-admin-surface shadow-none focus-visible:border-admin-primary focus-visible:ring-admin-primary/15"
                aria-invalid={Boolean(errors.summary)}
                aria-describedby={errors.summary ? "summary-error" : "summary-help"}
                {...register("summary")}
              />
              <p id="summary-help" className="text-xs text-admin-muted-text">
                Optional summary shown in listings and previews.
              </p>
              <FieldError id="summary-error" message={errors.summary?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-semibold text-admin-text">
                Content<RequiredIndicator />
              </label>
              <Textarea
                id="content"
                rows={18}
                placeholder="Write the full event details here..."
                className="min-h-80 rounded-[var(--admin-radius)] border-admin-border bg-admin-surface shadow-none focus-visible:border-admin-primary focus-visible:ring-admin-primary/15"
                aria-invalid={Boolean(errors.content)}
                aria-describedby={errors.content ? "content-error" : undefined}
                {...register("content")}
              />
              <FieldError id="content-error" message={errors.content?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Event image"
          description="Upload an event banner or keep a compatible external image URL."
          icon={ImageIcon}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <input type="hidden" {...register("coverImageAssetId")} />
              <MediaUploadField
                endpoint="eventCover"
                kind={MediaAssetKind.EVENT_COVER}
                label="Event banner upload"
                appearance="event-cover"
                value={coverAsset}
                onBusyChange={setIsMediaBusy}
                onChange={(asset) => {
                  setCoverAsset(asset);
                  setValue("coverImageAssetId", asset?.id ?? "", {
                    shouldValidate: true,
                  });
                  if (asset) {
                    setValue("coverImageUrl", "", { shouldValidate: true });
                  }
                }}
              />
              <FieldError id="cover-asset-error" message={errors.coverImageAssetId?.message} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="coverImageUrl" className="text-sm font-semibold text-admin-text">
                  External event image URL
                </label>
                <Input
                  id="coverImageUrl"
                  type="url"
                  placeholder="https://example.com/event.jpg"
                  className={controlClass}
                  disabled={Boolean(coverAsset)}
                  aria-invalid={Boolean(errors.coverImageUrl)}
                  aria-describedby={errors.coverImageUrl ? "cover-url-error" : "cover-url-help"}
                  {...register("coverImageUrl")}
                />
                <p id="cover-url-help" className="text-xs text-admin-muted-text">
                  Disabled while an uploaded banner is selected.
                </p>
                <FieldError id="cover-url-error" message={errors.coverImageUrl?.message} />
              </div>

              <div className="space-y-2">
                <label htmlFor="coverImageAlt" className="text-sm font-semibold text-admin-text">
                  Event image alt text
                </label>
                <Input
                  id="coverImageAlt"
                  placeholder="Describe the event image"
                  className={controlClass}
                  aria-invalid={Boolean(errors.coverImageAlt)}
                  aria-describedby={errors.coverImageAlt ? "cover-alt-error" : "cover-alt-help"}
                  {...register("coverImageAlt")}
                />
                <p id="cover-alt-help" className="text-xs text-admin-muted-text">
                  Required when an event image is provided.
                </p>
                <FieldError id="cover-alt-error" message={errors.coverImageAlt?.message} />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Event date and time"
          description="Set the event schedule in UTC."
          icon={CalendarRange}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="startAt" className="text-sm font-semibold text-admin-text">
                Start date and time (UTC)<RequiredIndicator />
              </label>
              <Input
                id="startAt"
                type="datetime-local"
                className={controlClass}
                aria-invalid={Boolean(errors.startAt)}
                aria-describedby={errors.startAt ? "start-error" : undefined}
                {...register("startAt")}
              />
              <FieldError id="start-error" message={errors.startAt?.message} />
            </div>
            <div className="space-y-2">
              <label htmlFor="endAt" className="text-sm font-semibold text-admin-text">
                End date and time (UTC)
              </label>
              <Input
                id="endAt"
                type="datetime-local"
                className={controlClass}
                aria-invalid={Boolean(errors.endAt)}
                aria-describedby={errors.endAt ? "end-error" : undefined}
                {...register("endAt")}
              />
              <FieldError id="end-error" message={errors.endAt?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Location and registration"
          description="Configure physical or online access and optional registration details."
          icon={MapPin}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="location" className="text-sm font-semibold text-admin-text">
                Physical location{isOnline ? null : <RequiredIndicator />}
              </label>
              <Input
                id="location"
                placeholder="Venue name and address"
                className={controlClass}
                disabled={isOnline}
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? "location-error" : "location-help"}
                {...register("location")}
              />
              <p id="location-help" className="text-xs text-admin-muted-text">
                {isOnline ? "Disabled for online events." : "Enter the venue or complete address."}
              </p>
              <FieldError id="location-error" message={errors.location?.message} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="onlineUrl" className="text-sm font-semibold text-admin-text">
                Online event URL{isOnline ? <RequiredIndicator /> : null}
              </label>
              <Input
                id="onlineUrl"
                type="url"
                placeholder="https://zoom.us/..."
                className={controlClass}
                disabled={!isOnline}
                aria-invalid={Boolean(errors.onlineUrl)}
                aria-describedby={errors.onlineUrl ? "online-error" : "online-help"}
                {...register("onlineUrl")}
              />
              <p id="online-help" className="text-xs text-admin-muted-text">
                {isOnline ? "Add the meeting or streaming link." : "Enable Online event to add a link."}
              </p>
              <FieldError id="online-error" message={errors.onlineUrl?.message} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="registrationUrl" className="text-sm font-semibold text-admin-text">
                Registration URL
              </label>
              <Input
                id="registrationUrl"
                type="url"
                placeholder="https://example.com/register"
                className={controlClass}
                aria-invalid={Boolean(errors.registrationUrl)}
                aria-describedby={errors.registrationUrl ? "registration-url-error" : "registration-url-help"}
                {...register("registrationUrl")}
              />
              <p id="registration-url-help" className="text-xs text-admin-muted-text">
                Optional external registration page.
              </p>
              <FieldError id="registration-url-error" message={errors.registrationUrl?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="registrationDeadline" className="text-sm font-semibold text-admin-text">
                Registration deadline (UTC)
              </label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                className={controlClass}
                aria-invalid={Boolean(errors.registrationDeadline)}
                aria-describedby={errors.registrationDeadline ? "registration-deadline-error" : undefined}
                {...register("registrationDeadline")}
              />
              <FieldError id="registration-deadline-error" message={errors.registrationDeadline?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="capacity" className="text-sm font-semibold text-admin-text">
                Capacity
              </label>
              <Input
                id="capacity"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                className={controlClass}
                aria-invalid={Boolean(errors.capacity)}
                aria-describedby={errors.capacity ? "capacity-error" : "capacity-help"}
                {...register("capacity")}
              />
              <p id="capacity-help" className="text-xs text-admin-muted-text">
                Leave empty for unlimited capacity.
              </p>
              <FieldError id="capacity-error" message={errors.capacity?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Taxonomy"
          description="Organize the event with its existing category and tags."
          icon={TagsIcon}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-semibold text-admin-text">
                Event category
              </label>
              <Select
                id="categoryId"
                className={controlClass}
                aria-invalid={Boolean(errors.categoryId)}
                aria-describedby={errors.categoryId ? "category-error" : undefined}
                {...register("categoryId")}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </Select>
              <FieldError id="category-error" message={errors.categoryId?.message} />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-admin-text">Tags</legend>
              {tags.length ? (
                <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex min-h-10 items-center gap-2 text-sm text-admin-text">
                      <input
                        type="checkbox"
                        value={tag.id}
                        className="size-4 shrink-0 accent-admin-primary"
                        {...register("tagIds")}
                      />
                      <span>{tag.name}{tag.isActive ? "" : " (inactive)"}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-admin-muted-text">
                  No active tags are available.
                </p>
              )}
              <FieldError id="tags-error" message={errors.tagIds?.message} />
            </fieldset>
          </div>
        </FormSection>
      </div>

      <aside className="min-w-0 space-y-6 xl:sticky xl:top-[calc(var(--admin-header-height)+2rem)]">
        <FormSection
          title="Publishing"
          description="Choose the current event workflow state."
          icon={CalendarClock}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-semibold text-admin-text">
                Status<RequiredIndicator />
              </label>
              <Select
                id="status"
                className={controlClass}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "status-error" : undefined}
                {...register("status")}
              >
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
              <FieldError id="status-error" message={errors.status?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="publishedAt" className="text-sm font-semibold text-admin-text">
                Published date (UTC)
              </label>
              <Input
                id="publishedAt"
                type="datetime-local"
                className={controlClass}
                aria-invalid={Boolean(errors.publishedAt)}
                aria-describedby={errors.publishedAt ? "published-error" : "published-help"}
                {...register("publishedAt")}
              />
              <p id="published-help" className="text-xs leading-5 text-admin-muted-text">
                Leave empty to publish immediately when status is Published.
              </p>
              <FieldError id="published-error" message={errors.publishedAt?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="scheduledFor" className="text-sm font-semibold text-admin-text">
                Scheduled publication (UTC)
              </label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                className={controlClass}
                disabled={selectedStatus !== EventStatus.SCHEDULED}
                aria-invalid={Boolean(errors.scheduledFor)}
                aria-describedby={errors.scheduledFor ? "scheduled-error" : "scheduled-help"}
                {...register("scheduledFor")}
              />
              <p id="scheduled-help" className="text-xs leading-5 text-admin-muted-text">
                Available only while the event status is Scheduled.
              </p>
              <FieldError id="scheduled-error" message={errors.scheduledFor?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Event options"
          description="Configure the supported event flags."
          icon={Settings2}
        >
          <div className="space-y-5">
            <label className="flex min-h-12 items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-admin-primary"
                {...register("featured")}
              />
              <span>
                <span className="block text-sm font-semibold text-admin-text">Featured event</span>
                <span className="mt-1 block text-xs leading-5 text-admin-muted-text">
                  Highlight this event in supported public content areas.
                </span>
              </span>
            </label>

            <label className="flex min-h-12 items-start gap-3 border-t border-admin-border pt-5">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-admin-primary"
                {...register("isOnline")}
              />
              <span>
                <span className="block text-sm font-semibold text-admin-text">Online event</span>
                <span className="mt-1 block text-xs leading-5 text-admin-muted-text">
                  Use an online meeting URL instead of a physical location.
                </span>
              </span>
            </label>
          </div>
        </FormSection>

        <section className="rounded-[var(--admin-radius)] border border-admin-border bg-admin-surface p-5 shadow-[var(--admin-shadow)]">
          <div className="grid gap-3">
            <Button
              type="submit"
              size="lg"
              className="h-11 rounded-[var(--admin-radius)] bg-admin-primary text-white hover:bg-admin-primary-hover focus-visible:ring-admin-primary/25"
              disabled={isSubmitting || isMediaBusy}
            >
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
              {isMediaBusy
                ? "Upload in progress"
                : isSubmitting
                  ? "Saving..."
                  : "Save event"}
            </Button>
            <Link
              href="/admin/events"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[var(--admin-radius)] border-admin-border",
              )}
            >
              Cancel
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-admin-muted-text">
            Saving uses the selected status and the existing Event workflow rules.
          </p>
        </section>
      </aside>
    </form>
  );
}
