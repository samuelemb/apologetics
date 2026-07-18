"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  createUserAction,
  updateUserAction,
} from "@/app/admin/(protected)/users/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { getCreatableUserRoles } from "@/lib/user-policy";
import { cn } from "@/lib/utils";
import {
  userCreateSchema,
  userEditSchema,
  type UserCreateInput,
  type UserEditInput,
} from "@/schemas/user";
import type { UserEditValues } from "@/types/user";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

function roleLabel(role: UserRole): string {
  return role.replaceAll("_", " ");
}

export function UserCreateForm({ actorRole }: { actorRole: UserRole }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const allowedRoles = getCreatableUserRoles(actorRole);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      image: "",
      role: UserRole.AUTHOR,
      status: UserStatus.INVITED,
      temporaryPassword: "",
    },
  });
  const status = useWatch({ control, name: "status" });
  const statusField = register("status");

  async function onSubmit(values: UserCreateInput) {
    setFormError(undefined);
    const result = await createUserAction(values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) {
          setError(field as keyof UserCreateInput, { message });
        }
      });
      return;
    }

    router.push("/admin/users");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="space-y-5 rounded-md border bg-background p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="name-error" message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Select
              id="role"
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "role-error" : undefined}
              {...register("role")}
            >
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Select>
            <FieldError id="role-error" message={errors.role?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select
              id="status"
              aria-invalid={Boolean(errors.status)}
              aria-describedby={errors.status ? "status-error" : undefined}
              {...statusField}
              onChange={(event) => {
                statusField.onChange(event);
                if (event.target.value === UserStatus.INVITED) {
                  setValue("temporaryPassword", "", { shouldValidate: true });
                }
              }}
            >
              <option value={UserStatus.INVITED}>INVITED</option>
              <option value={UserStatus.ACTIVE}>ACTIVE</option>
            </Select>
            <FieldError id="status-error" message={errors.status?.message} />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label htmlFor="image" className="text-sm font-medium">
              Image URL <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="image"
              type="url"
              placeholder="https://"
              aria-invalid={Boolean(errors.image)}
              aria-describedby={errors.image ? "image-error" : undefined}
              {...register("image")}
            />
            <FieldError id="image-error" message={errors.image?.message} />
          </div>

          {status === UserStatus.ACTIVE ? (
            <div className="space-y-2 lg:col-span-2">
              <label htmlFor="temporaryPassword" className="text-sm font-medium">
                Temporary password
              </label>
              <div className="relative">
                <Input
                  id="temporaryPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={Boolean(errors.temporaryPassword)}
                  aria-describedby={
                    errors.temporaryPassword
                      ? "temporary-password-error"
                      : "temporary-password-help"
                  }
                  {...register("temporaryPassword")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-0.5"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <p id="temporary-password-help" className="text-xs text-muted-foreground">
                At least 12 characters with uppercase, lowercase, and a number.
              </p>
              <FieldError
                id="temporary-password-error"
                message={errors.temporaryPassword?.message}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground lg:col-span-2">
              Invitation email delivery is not implemented. This account will
              remain unable to sign in until a future password-setup flow is
              completed.
            </p>
          )}
        </div>
      </section>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
          {isSubmitting ? "Creating..." : "Create user"}
        </Button>
        <Link
          href="/admin/users"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft />
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function UserEditForm({
  actorId,
  actorRole,
  user,
}: {
  actorId: string;
  actorRole: UserRole;
  user: UserEditValues;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const isSelf = actorId === user.id;
  const roleOptions = isSelf
    ? [user.role]
    : getCreatableUserRoles(actorRole);
  const statusOptions =
    isSelf || user.status === UserStatus.INVITED
      ? [user.status]
      : [UserStatus.ACTIVE, UserStatus.SUSPENDED];
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserEditInput>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
    },
  });

  async function onSubmit(values: UserEditInput) {
    setFormError(undefined);
    const result = await updateUserAction(user.id, values);

    if (!result.ok) {
      setFormError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        const message = messages?.[0];
        if (message) {
          setError(field as keyof UserEditInput, { message });
        }
      });
      return;
    }

    router.push("/admin/users");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className="space-y-5 rounded-md border bg-background p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="name-error" message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            <FieldError id="email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Select
              id="role"
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? "role-error" : undefined}
              {...register("role")}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Select>
            <FieldError id="role-error" message={errors.role?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select
              id="status"
              aria-invalid={Boolean(errors.status)}
              aria-describedby={errors.status ? "status-error" : undefined}
              {...register("status")}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <FieldError id="status-error" message={errors.status?.message} />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label htmlFor="image" className="text-sm font-medium">
              Image URL <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="image"
              type="url"
              placeholder="https://"
              aria-invalid={Boolean(errors.image)}
              aria-describedby={errors.image ? "image-error" : undefined}
              {...register("image")}
            />
            <FieldError id="image-error" message={errors.image?.message} />
          </div>

          <p className="text-sm text-muted-foreground lg:col-span-2">
            Password changes and invitation activation are deferred to the
            future password-reset and invitation flows.
          </p>
        </div>
      </section>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
          {isSubmitting ? "Saving..." : "Save user"}
        </Button>
        <Link
          href="/admin/users"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft />
          Cancel
        </Link>
      </div>
    </form>
  );
}
