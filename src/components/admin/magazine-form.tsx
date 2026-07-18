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
  createMagazineAction,
  updateMagazineAction,
} from "@/app/admin/(protected)/magazine/actions";
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
import { canUseMagazineStatus } from "@/lib/magazine-policy";
import { cn } from "@/lib/utils";
import {
  generateMagazineSlug,
  isValidMagazineRemoteUrl,
  magazineFormSchema,
  type MagazineFormInput,
} from "@/schemas/magazine";
import type {
  MagazineEditValues,
  MagazineFormOption,
} from "@/types/magazine";

type MagazineFormProps = {
  role: UserRole;
  categories: MagazineFormOption[];
  tags: MagazineFormOption[];
  issue?: MagazineEditValues;
};

const emptyValues: MagazineFormInput = {
  title: "",
  slug: "",
  issueNumber: "",
  volume: "",
  description: "",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  pdfUrl: "",
  pdfAssetId: "",
  pdfFileName: "",
  pdfFileSize: "",
  pageCount: "",
  publicationDate: "",
  categoryId: "",
  tagIds: [],
  status: ContentStatus.DRAFT,
  featured: false,
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

export function MagazineForm({
  role,
  categories,
  tags,
  issue,
}: MagazineFormProps) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(issue));
  const [formError, setFormError] = useState<string>();
  const [coverAsset, setCoverAsset] = useState(issue?.coverImageAsset ?? null);
  const [pdfAsset, setPdfAsset] = useState(issue?.pdfAsset ?? null);
  const [isCoverBusy, setIsCoverBusy] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MagazineFormInput>({
    resolver: zodResolver(magazineFormSchema),
    defaultValues: issue
      ? {
          title: issue.title,
          slug: issue.slug,
          issueNumber: issue.issueNumber,
          volume: issue.volume,
          description: issue.description,
          coverImageUrl: issue.coverImageUrl,
          coverImageAssetId: issue.coverImageAssetId,
          coverImageAlt: issue.coverImageAlt,
          pdfUrl: issue.pdfUrl,
          pdfAssetId: issue.pdfAssetId,
          pdfFileName: issue.pdfFileName,
          pdfFileSize: issue.pdfFileSize,
          pageCount: issue.pageCount,
          publicationDate: issue.publicationDate,
          categoryId: issue.categoryId,
          tagIds: issue.tagIds,
          status: issue.status,
          featured: issue.featured,
        }
      : emptyValues,
  });
  const titleField = register("title");
  const slugField = register("slug");
  const coverImageUrl = useWatch({ control, name: "coverImageUrl" });
  const coverImageAlt = useWatch({ control, name: "coverImageAlt" });
  const allowedStatuses = Object.values(ContentStatus).filter((status) =>
    canUseMagazineStatus(role, status),
  );
  const showCoverPreview =
    Boolean(coverImageUrl) && isValidMagazineRemoteUrl(coverImageUrl);

  async function onSubmit(values: MagazineFormInput) {
    setFormError(undefined);
    const result = issue
      ? await updateMagazineAction(issue.id, values)
      : await createMagazineAction(values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) {
          setError(field as keyof MagazineFormInput, { message });
        }
      });
      return;
    }

    router.push("/admin/magazine");
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
          title="Magazine details"
          description="Add the issue title, numbering, and description."
          icon={FileText}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="title" className="text-sm font-semibold text-admin-text">
                Title<RequiredIndicator />
              </label>
              <Input
                id="title"
                placeholder="Enter magazine issue title"
                className={controlClass}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : "title-help"}
                {...titleField}
                onChange={(event) => {
                  titleField.onChange(event);
                  if (!slugEdited) {
                    setValue("slug", generateMagazineSlug(event.target.value), {
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <p id="title-help" className="text-xs text-admin-muted-text">
                Use the title readers will see for this issue.
              </p>
              <FieldError id="title-error" message={errors.title?.message} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="slug" className="text-sm font-semibold text-admin-text">
                Slug<RequiredIndicator />
              </label>
              <Input
                id="slug"
                placeholder="magazine-issue-slug"
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
                Generated from the title until you edit it.
              </p>
              <FieldError id="slug-error" message={errors.slug?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="issueNumber" className="text-sm font-semibold text-admin-text">
                Issue number
              </label>
              <Input
                id="issueNumber"
                placeholder="For example, Issue 15"
                className={controlClass}
                aria-invalid={Boolean(errors.issueNumber)}
                aria-describedby={errors.issueNumber ? "issue-number-error" : "issue-number-help"}
                {...register("issueNumber")}
              />
              <p id="issue-number-help" className="text-xs text-admin-muted-text">
                The issue identifier shown to readers.
              </p>
              <FieldError id="issue-number-error" message={errors.issueNumber?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="volume" className="text-sm font-semibold text-admin-text">
                Volume
              </label>
              <Input
                id="volume"
                placeholder="For example, Volume 4"
                className={controlClass}
                aria-invalid={Boolean(errors.volume)}
                aria-describedby={errors.volume ? "volume-error" : "volume-help"}
                {...register("volume")}
              />
              <p id="volume-help" className="text-xs text-admin-muted-text">
                The volume associated with this issue.
              </p>
              <FieldError id="volume-error" message={errors.volume?.message} />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="description" className="text-sm font-semibold text-admin-text">
                Description
              </label>
              <Textarea
                id="description"
                rows={7}
                placeholder="Write a short description of this magazine issue."
                className="min-h-40 rounded-[var(--admin-radius)] border-admin-border bg-admin-surface shadow-none focus-visible:border-admin-primary focus-visible:ring-admin-primary/15"
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "description-error" : "description-help"}
                {...register("description")}
              />
              <p id="description-help" className="text-xs text-admin-muted-text">
                Summarize the focus or theme of the issue.
              </p>
              <FieldError id="description-error" message={errors.description?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Cover image"
          description="Upload a cover or keep a compatible external image URL."
          icon={ImageIcon}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="min-w-0 space-y-5">
              <div className="space-y-2">
                <input type="hidden" {...register("coverImageAssetId")} />
                <MediaUploadField
                  endpoint="magazineCover"
                  kind={MediaAssetKind.MAGAZINE_COVER}
                  label="Cover image upload"
                  value={coverAsset}
                  disabled={isPdfBusy}
                  onBusyChange={setIsCoverBusy}
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

              <div className="space-y-2">
                <label htmlFor="coverImageUrl" className="text-sm font-semibold text-admin-text">
                  External cover image URL
                </label>
                <Input
                  id="coverImageUrl"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
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
                  placeholder="Describe the magazine cover"
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

            <div>
              <p className="mb-2 text-sm font-semibold text-admin-text">Cover preview</p>
              <div className="aspect-[3/4] w-full overflow-hidden rounded-[var(--admin-radius)] border border-admin-border bg-admin-muted">
                {showCoverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt={coverImageAlt || "Magazine cover preview"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-admin-muted-text">
                    <ImageIcon className="size-8" aria-hidden="true" />
                    <span className="text-xs">External cover preview</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Magazine PDF"
          description="Upload the issue PDF or provide its existing external file details."
          icon={FileText}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <input type="hidden" {...register("pdfAssetId")} />
              <MediaUploadField
                endpoint="magazinePdf"
                kind={MediaAssetKind.MAGAZINE_PDF}
                label="Magazine PDF upload"
                value={pdfAsset}
                disabled={isCoverBusy}
                onBusyChange={setIsPdfBusy}
                onChange={(asset) => {
                  setPdfAsset(asset);
                  setValue("pdfAssetId", asset?.id ?? "", {
                    shouldValidate: true,
                  });
                  if (asset) {
                    setValue("pdfUrl", "", { shouldValidate: true });
                    setValue("pdfFileName", "", { shouldValidate: true });
                    setValue("pdfFileSize", "", { shouldValidate: true });
                  }
                }}
              />
              <FieldError id="pdf-asset-error" message={errors.pdfAssetId?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="pdfUrl" className="text-sm font-semibold text-admin-text">
                External PDF URL
              </label>
              <Input
                id="pdfUrl"
                type="url"
                placeholder="https://example.com/issue.pdf"
                className={controlClass}
                disabled={Boolean(pdfAsset)}
                aria-invalid={Boolean(errors.pdfUrl)}
                aria-describedby={errors.pdfUrl ? "pdf-url-error" : "pdf-url-help"}
                {...register("pdfUrl")}
              />
              <p id="pdf-url-help" className="text-xs text-admin-muted-text">
                Disabled while an uploaded PDF is selected.
              </p>
              <FieldError id="pdf-url-error" message={errors.pdfUrl?.message} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="pdfFileName" className="text-sm font-semibold text-admin-text">
                  PDF file name
                </label>
                <Input
                  id="pdfFileName"
                  placeholder="magazine-issue.pdf"
                  className={controlClass}
                  disabled={Boolean(pdfAsset)}
                  aria-invalid={Boolean(errors.pdfFileName)}
                  aria-describedby={errors.pdfFileName ? "pdf-name-error" : "pdf-name-help"}
                  {...register("pdfFileName")}
                />
                <p id="pdf-name-help" className="text-xs text-admin-muted-text">
                  Used with an external PDF URL.
                </p>
                <FieldError id="pdf-name-error" message={errors.pdfFileName?.message} />
              </div>

              <div className="space-y-2">
                <label htmlFor="pdfFileSize" className="text-sm font-semibold text-admin-text">
                  PDF file size (bytes)
                </label>
                <Input
                  id="pdfFileSize"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="File size in bytes"
                  className={controlClass}
                  disabled={Boolean(pdfAsset)}
                  aria-invalid={Boolean(errors.pdfFileSize)}
                  aria-describedby={errors.pdfFileSize ? "pdf-size-error" : "pdf-size-help"}
                  {...register("pdfFileSize")}
                />
                <p id="pdf-size-help" className="text-xs text-admin-muted-text">
                  Enter the external PDF size in bytes.
                </p>
                <FieldError id="pdf-size-error" message={errors.pdfFileSize?.message} />
              </div>

              <div className="space-y-2">
                <label htmlFor="pageCount" className="text-sm font-semibold text-admin-text">
                  Page count
                </label>
                <Input
                  id="pageCount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Number of pages"
                  className={controlClass}
                  aria-invalid={Boolean(errors.pageCount)}
                  aria-describedby={errors.pageCount ? "page-count-error" : "page-count-help"}
                  {...register("pageCount")}
                />
                <p id="page-count-help" className="text-xs text-admin-muted-text">
                  Total number of pages in this issue.
                </p>
                <FieldError id="page-count-error" message={errors.pageCount?.message} />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Taxonomy"
          description="Organize the issue with its existing category and tags."
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
                aria-describedby={errors.categoryId ? "category-error" : "category-help"}
                {...register("categoryId")}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </Select>
              <p id="category-help" className="text-xs text-admin-muted-text">
                Choose the category readers can use to find this issue.
              </p>
              <FieldError id="category-error" message={errors.categoryId?.message} />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold text-admin-text">Tags</legend>
              <p className="mt-1 text-xs text-admin-muted-text">
                Select all tags that describe this issue.
              </p>
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
                <p className="mt-3 text-sm text-admin-muted-text">
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
          description="Choose the issue status and publication date."
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
                aria-describedby={errors.status ? "status-error" : "status-help"}
                {...register("status")}
              >
                {allowedStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
              <p id="status-help" className="text-xs leading-5 text-admin-muted-text">
                Use Draft, Published, or Archived according to your role.
              </p>
              <FieldError id="status-error" message={errors.status?.message} />
            </div>

            <div className="space-y-2">
              <label htmlFor="publicationDate" className="text-sm font-semibold text-admin-text">
                Publication date (UTC)
              </label>
              <Input
                id="publicationDate"
                type="date"
                className={controlClass}
                aria-invalid={Boolean(errors.publicationDate)}
                aria-describedby={errors.publicationDate ? "publication-date-error" : "publication-date-help"}
                {...register("publicationDate")}
              />
              <p id="publication-date-help" className="text-xs leading-5 text-admin-muted-text">
                The date associated with this magazine issue.
              </p>
              <FieldError id="publication-date-error" message={errors.publicationDate?.message} />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Magazine options"
          description="Control the supported issue highlight option."
          icon={Settings2}
        >
          <label className="flex min-h-12 items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-admin-primary"
              {...register("featured")}
            />
            <span>
              <span className="block text-sm font-semibold text-admin-text">Featured issue</span>
              <span className="mt-1 block text-xs leading-5 text-admin-muted-text">
                Highlight this issue in supported public content areas.
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
              disabled={isSubmitting || isCoverBusy || isPdfBusy}
            >
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
              {isCoverBusy || isPdfBusy
                ? "Upload in progress"
                : isSubmitting
                  ? "Saving..."
                  : "Save issue"}
            </Button>
            <Link
              href="/admin/magazine"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[var(--admin-radius)] border-admin-border",
              )}
            >
              Cancel
            </Link>
          </div>
          <p className="mt-3 text-xs leading-5 text-admin-muted-text">
            Saving uses the selected status and the existing Magazine workflow rules.
          </p>
        </section>
      </aside>
    </form>
  );
}
