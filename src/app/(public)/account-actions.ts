"use server";

import { ZodError } from "zod";

import {
  registerPublicUser,
  resendPublicVerification,
  updatePublicUserProfile,
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
  PublicAccountError,
} from "@/services/public-account.service";
import { requirePublicUser } from "@/lib/auth/guards";
import type { PublicAccountActionState } from "@/lib/public-account-action-state";

function actionError(error: unknown): PublicAccountActionState {
  if (error instanceof ZodError) {
    return {
      status: "error",
      message: error.issues[0]?.message ?? "Check the information you entered.",
    };
  }

  if (error instanceof PublicAccountError) {
    return { status: "error", message: error.message };
  }

  return {
    status: "error",
    message: "Something went wrong. Please try again.",
  };
}

export async function registerPublicUserAction(
  _previousState: PublicAccountActionState,
  formData: FormData,
): Promise<PublicAccountActionState> {
  try {
    const result = await registerPublicUser({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    return {
      status: "success",
      email: result.email,
      message: "We sent a four-digit code to your email address.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function resendVerificationAction(
  _previousState: PublicAccountActionState,
  formData: FormData,
): Promise<PublicAccountActionState> {
  try {
    const email = String(formData.get("email") ?? "");
    await resendPublicVerification({ email });
    return {
      status: "success",
      email,
      message: "We sent a new verification code.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function updatePublicProfileAction(
  _previousState: PublicAccountActionState,
  formData: FormData,
): Promise<PublicAccountActionState> {
  try {
    const user = await requirePublicUser();
    const updated = await updatePublicUserProfile(user.id, {
      name: String(formData.get("name") ?? ""),
    });
    return {
      status: "success",
      message: "Your display name has been updated.",
      email: updated.name,
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function requestPasswordResetAction(_previousState: PublicAccountActionState, formData: FormData): Promise<PublicAccountActionState> {
  try {
    const email = String(formData.get("email") ?? "");
    await requestPasswordReset({ email });
    return { status: "success", email: email.trim().toLowerCase(), message: "If an eligible account exists for this email, we sent a password reset code." };
  } catch (error) { return actionError(error); }
}

export async function resendPasswordResetCodeAction(_previousState: PublicAccountActionState, formData: FormData): Promise<PublicAccountActionState> {
  try {
    const email = String(formData.get("email") ?? "");
    await resendPasswordResetCode({ email });
    return { status: "success", email: email.trim().toLowerCase(), message: "If an eligible account exists for this email, we sent a new password reset code." };
  } catch (error) { return actionError(error); }
}

export async function resetPasswordAction(_previousState: PublicAccountActionState, formData: FormData): Promise<PublicAccountActionState> {
  try {
    await resetPassword({ email: String(formData.get("email") ?? ""), code: String(formData.get("code") ?? ""), password: String(formData.get("password") ?? ""), confirmPassword: String(formData.get("confirmPassword") ?? "") });
    return { status: "success", message: "Your password has been reset. You can now sign in." };
  } catch (error) { return actionError(error); }
}
