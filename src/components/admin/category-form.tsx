"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  createCategoryAction,
  updateCategoryAction,
} from "@/app/admin/(protected)/categories/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import {
  categoryFormSchema,
  generateCategorySlug,
  type CategoryFormInput,
} from "@/schemas/category";
import type { CategoryEditValues } from "@/types/category";

const emptyValues: CategoryFormInput = {
  name: "",
  slug: "",
  description: "",
  type: CategoryType.GENERAL,
  isActive: true,
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CategoryForm({ category }: { category?: CategoryEditValues }) {
  const router = useRouter();
  const [slugEdited, setSlugEdited] = useState(Boolean(category));
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ?? emptyValues,
  });
  const nameField = register("name");
  const slugField = register("slug");

  async function onSubmit(values: CategoryFormInput) {
    setFormError(undefined);
    const result = category
      ? await updateCategoryAction(category.id, values)
      : await createCategoryAction(values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) setError(field as keyof CategoryFormInput, { message });
      });
      return;
    }

    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="space-y-5 rounded-md border bg-background p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input
              id="name"
              aria-invalid={Boolean(errors.name)}
              {...nameField}
              onChange={(event) => {
                nameField.onChange(event);
                if (!slugEdited) {
                  setValue("slug", generateCategorySlug(event.target.value), {
                    shouldValidate: true,
                  });
                }
              }}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">Slug</label>
            <Input
              id="slug"
              aria-invalid={Boolean(errors.slug)}
              {...slugField}
              onChange={(event) => {
                setSlugEdited(true);
                slugField.onChange(event);
              }}
            />
            <FieldError message={errors.slug?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">Type</label>
            <Select id="type" {...register("type")}>
              {Object.values(CategoryType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
            <FieldError message={errors.type?.message} />
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                {...register("isActive")}
              />
              Active
            </label>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="description" rows={5} {...register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
        </div>
      </section>

      {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
          {isSubmitting ? "Saving..." : "Save category"}
        </Button>
        <Link href="/admin/categories" className={cn(buttonVariants({ variant: "outline" }))}>
          <ArrowLeft />
          Cancel
        </Link>
      </div>
    </form>
  );
}
