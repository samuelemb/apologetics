import { NextResponse, type NextRequest } from "next/server";

import { listPublicNews } from "@/services/public-news.service";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limitValue = searchParams.get("limit");

  try {
    const result = await listPublicNews({
      categorySlug: searchParams.get("category") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: limitValue === null ? undefined : Number(limitValue),
    });

    return NextResponse.json(result, {
      status: 200,
      headers: noStoreHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load more news." },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }
}
