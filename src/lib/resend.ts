import "server-only";

type SendVerificationEmailInput = {
  email: string;
  name: string;
  code: string;
};

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export async function sendVerificationEmail({
  email,
  name,
  code,
}: SendVerificationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new EmailDeliveryError("Email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your APOLOGETICS account",
      text: `Hello ${name},\n\nYour APOLOGETICS መፅሔት verification code is ${code}. It expires in 10 minutes.\n\nIf you did not create this account, you can ignore this email.`,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new EmailDeliveryError("Unable to send the verification email.");
  }
}
