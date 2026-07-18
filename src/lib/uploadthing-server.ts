import "server-only";

import { UTApi } from "uploadthing/server";

export class UploadProviderError extends Error {
  constructor(message = "File storage is temporarily unavailable.") {
    super(message);
    this.name = "UploadProviderError";
  }
}

function createUploadThingApi(): UTApi {
  const token = process.env.UPLOADTHING_TOKEN?.trim();
  if (!token) {
    throw new UploadProviderError("File storage is not configured.");
  }

  return new UTApi({ token });
}

export async function deleteUploadThingFiles(fileKeys: string[]): Promise<void> {
  if (fileKeys.length === 0) return;

  try {
    const result = await createUploadThingApi().deleteFiles(fileKeys);
    if (!result.success || result.deletedCount !== fileKeys.length) {
      throw new UploadProviderError();
    }
  } catch (error) {
    if (error instanceof UploadProviderError) throw error;
    throw new UploadProviderError();
  }
}
