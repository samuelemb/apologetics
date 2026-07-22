"use server";

import { ZodError } from "zod";

import {
  registerPublicUser,
  resendPublicVerification,
  PublicAccountError,
} from "@/services/public-account.service";

export type PublicAccountActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  email?: string;
};

export const initialPublicAccountActionState: PublicAccountActionState = {
  status: "idle",
};

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
