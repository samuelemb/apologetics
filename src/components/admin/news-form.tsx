"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  FileText,
  ImageIcon,
  LoaderCircle,
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
  createNewsAction,
  updateNewsAction,
} from "@/app/admin/(protected)/news/actions";
import { MediaUploadField } from "@/components/admin/media-upload-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ContentStatus,
  MediaAssetKind,
  type UserRole,
} from "@/generated/prisma/enums";
import { canUseNewsStatus } from "@/lib/news-policy";
import { cn } from "@/lib/utils";
import {
  generateSlug,
  newsFormSchema,
  type NewsFormInput,
} from "@/schemas/news";
import type { NewsEditValues, NewsFormOption } from "@/types/news";

type NewsFormProps = {
  role: UserRole;
  categories: NewsFormOption[];
  tags: NewsFormOption[];
  article?: NewsEditValues;
};

const emptyValues: NewsFormInput = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  categoryId: "",
  tagIds: [],
  status: ContentStatus.DRAFT,
  featured: false,
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

function statusLabel(status: ContentStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function NewsForm({ role, categories, tags, article }: NewsFormProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(article));
  const [formError, setFormError] = useState<string>();
  const [coverAsset, setCoverAsset] = useState(article?.coverImageAsset ?? null);
  const [isMediaBusy, setIsMediaBusy] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewsFormInput>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: article
      ? {
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          coverImageUrl: article.coverImageUrl,
          coverImageAssetId: article.coverImageAssetId,
          coverImageAlt: article.coverImageAlt,
          categoryId: article.categoryId,
          tagIds: article.tagIds,
          status: article.status,
          featured: article.featured,
          publishedAt: article.publishedAt,
          scheduledFor: article.scheduledFor,
        }
      : emptyValues,
  });
  const titleField = register("title");
  const slugField = register("slug");
  const selectedStatus = useWatch({ control, name: "status" });
  const allowedStatuses = Object.values(ContentStatus).filter((status) =>
    canUseNewsStatus(role, status),
  );

  async function onSubmit(values: NewsFormInput) {
    setFormError(undefined);
    const result = article
      ? await updateNewsAction(article.id, values)
      : await createNewsAction(values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) {
          setError(field as keyof NewsFormInput, { message });
        }
      });
      return;
    }

    router.push("/admin/news");
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
          title="Article content"
          description="Write the article title, summary, and body."
          icon={FileText}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-admin-text">
                Title<RequiredIndicator />
              </label>
              <Input
                id="title"
                placeholder="Enter article title"
                className={controlClass}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : "title-help"}
                {...titleField}
                onChange={(event) => {
                  titleField.onChange(event);
                  if (!slugEdited) {
                    setValue("slug", generateSlug(event.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <p id="title-help" className="text-xs text-admin-muted-text">
                Use a clear, descriptive headline.
              </p>
              <FieldError id="title-error" message={errors.title?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-semibold text-admin-text">
                Slug<RequiredIndicator />
              </label>
              <Input
                id="slug"
                placeholder="article-url-slug"
                className={controlClass}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={errors.slug ? "slug-error" : "slug-help"}
                {...slugField}
                onChange={(event) => {
                  setSlugEdited(true);
                  slugField.onChange(event);
                }}
              />
              <p id="slug-help" className="text-xs text-admin-muted-text">
                The slug is generated from the title until you edit it.
              </p>
              <FieldError id="slug-error" message={errors.slug?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="excerpt" className="text-sm font-semibold text-admin-text">
                Excerpt
              </label>
              <Textarea
                id="excerpt"
                rows={4}
                placeholder="Write a short summary for article listings."
                className="rounded-[var(--admin-radius)] border-admin-border bg-admin-surface shadow-none focus-visible:border-admin-primary focus-visible:ring-admin-primary/15"
                aria-invalid={Boolean(errors.excerpt)}
                aria-describedby={errors.excerpt ? "excerpt-error" : "excerpt-help"}
                {...register("excerpt")}
              />
              <p id="excerpt-help" className="text-xs text-admin-muted-text">
                Optional summary shown in listings and previews.
              </p>
              <FieldError id="excerpt-error" message={errors.excerpt?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-semibold text-admin-text">
                Content<RequiredIndicator />
              </label>
              <Textarea
                id="content"
                rows={18}
                placeholder="Write the article content here..."
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
          title="Cover image"
          description="Upload a cover or keep a compatible external image URL."
          icon={ImageIcon}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <input type="hidden" {...register("coverImageAssetId")} />
              <MediaUploadField
                endpoint="newsCover"
                kind={MediaAssetKind.NEWS_COVER}
                label="Cover image upload"
                appearance="news-cover"
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
                  External cover image URL
                </label>
                <Input
                  id="coverImageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  className={controlClass}
                  disabled={Boolean(coverAsset)}
                  aria-invalid={Boolean(errors.coverImageUrl)}
                  aria-describedby={errors.coverImageUrl ? "cover-url-error" : "cover-url-help"}
                  {...register("coverImageUrl")}
                />
                <p id="cover-url-help" className="text-xs text-admin-muted-text">
                  Disabled while an uploaded cover is selected.
                </p>
                <FieldError id="cover-url-error" message={errors.coverImageUrl?.message} />
              </div>

              <div className="space-y-2">
                <label htmlFor="coverImageAlt" className="text-sm font-semibold text-admin-text">
                  Cover image alt text
                </label>
                <Input
                  id="coverImageAlt"
                  placeholder="Describe the cover image"
                  className={controlClass}
                  aria-invalid={Boolean(errors.coverImageAlt)}
                  aria-describedby={errors.coverImageAlt ? "cover-alt-error" : "cover-alt-help"}
                  {...register("coverImageAlt")}
                />
                <p id="cover-alt-help" className="text-xs text-admin-muted-text">
                  Required when a cover image is provided.
                </p>
                <FieldError id="cover-alt-error" message={errors.coverImageAlt?.message} />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Taxonomy"
          description="Organize the article with its existing category and tags."
          icon={TagsIcon}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-semibold text-admin-text">
                Category
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
          description="Choose the current article workflow state."
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
                Scheduled date (UTC)
              </label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                className={controlClass}
                disabled={selectedStatus !== ContentStatus.SCHEDULED}
                aria-invalid={Boolean(errors.scheduledFor)}
                aria-describedby={errors.scheduledFor ? "scheduled-error" : "scheduled-help"}
                {...register("scheduledFor")}
              />
              <p id="scheduled-help" className="text-xs leading-5 text-admin-muted-text">
                Available only while the article status is Scheduled.
              </p>
              <FieldError id="scheduled-error" message={errors.scheduledFor?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="News options"
          description="Control the supported article highlight option."
          icon={Settings2}
        >
          <label className="flex min-h-12 items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-admin-primary"
              {...register("featured")}
            />
            <span>
              <span className="block text-sm font-semibold text-admin-text">Featured article</span>
              <span className="mt-1 block text-xs leading-5 text-admin-muted-text">
                Highlight this article in supported public content areas.
              </span>
            </span>
          </label>
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
                  : "Save article"}
            </Button>
            <Link
              href="/admin/news"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[var(--admin-radius)] border-admin-border",
              )}
            >
              Cancel
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-admin-muted-text">
            Saving uses the selected status and the existing News workflow rules.
          </p>
        </section>
      </aside>
    </form>
  );
}
