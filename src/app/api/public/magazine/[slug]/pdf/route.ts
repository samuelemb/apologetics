import { NextResponse } from "next/server";

import { getTrackedPublicMagazinePdf } from "@/services/public-magazine-download.service";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

type PdfRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: PdfRouteContext,
) {
  const { slug } = await params;

  try {
    const pdfUrl = await getTrackedPublicMagazinePdf(slug.trim());

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "Magazine PDF unavailable." },
        {
          status: 404,
          headers: noStoreHeaders,
        },
      );
    }

    const response = NextResponse.redirect(pdfUrl, 307);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to open magazine PDF." },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }
}
