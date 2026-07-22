export type PublicAccountActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  email?: string;
};

export const initialPublicAccountActionState: PublicAccountActionState = {
  status: "idle",
};
