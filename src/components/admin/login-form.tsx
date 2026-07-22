"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  credentialsSchema,
  type CredentialsInput,
} from "@/schemas/auth";

const INVALID_CREDENTIALS_MESSAGE =
  "The email or password is incorrect, or this account cannot sign in.";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: CredentialsInput) {
    setAuthenticationError(undefined);

    try {
      const result = await signIn("admin-credentials", {
        email: values.email,
        password: values.password,
        callbackUrl: "/admin",
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setAuthenticationError(INVALID_CREDENTIALS_MESSAGE);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setAuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-admin-text" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="h-[var(--admin-control-height)] rounded-[var(--admin-radius)] border-admin-border bg-admin-surface focus-visible:border-admin-primary focus-visible:ring-admin-primary/20"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-admin-danger">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-admin-text" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-[var(--admin-control-height)] rounded-[var(--admin-radius)] border-admin-border bg-admin-surface pr-12 focus-visible:border-admin-primary focus-visible:ring-admin-primary/20"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-9 text-admin-muted-text hover:bg-admin-background hover:text-admin-text focus-visible:ring-admin-primary/30"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-admin-danger">
            {errors.password.message}
          </p>
        )}
      </div>

      <p className="text-right text-sm text-admin-muted-text">
        Password recovery: Coming soon
      </p>

      <div aria-live="polite">
        {authenticationError && (
          <p
            className="rounded-[var(--admin-radius)] border border-admin-danger/20 bg-admin-primary-soft px-3 py-2.5 text-sm text-admin-danger"
            role="alert"
          >
            {authenticationError}
          </p>
        )}
      </div>

      <Button
        className="h-[var(--admin-control-height)] w-full rounded-[var(--admin-radius)] bg-admin-primary text-white hover:bg-admin-primary-hover focus-visible:border-admin-primary focus-visible:ring-admin-primary/30"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting && <LoaderCircle className="animate-spin" />}
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
