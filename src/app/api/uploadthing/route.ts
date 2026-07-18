import { createRouteHandler } from "uploadthing/next";

import { uploadRouter } from "@/app/api/uploadthing/core";

export const runtime = "nodejs";

export const { GET, POST } = createRouteHandler({ router: uploadRouter });
