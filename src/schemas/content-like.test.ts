import assert from "node:assert/strict";
import test from "node:test";

import { ContentType } from "@/generated/prisma/enums";
import { contentLikeSchema } from "@/schemas/content-like";

test("content likes require a valid content type and identifier", () => {
  assert.equal(
    contentLikeSchema.safeParse({ contentType: ContentType.NEWS, contentId: "article-1" }).success,
    true,
  );
  assert.equal(
    contentLikeSchema.safeParse({ contentType: "INVALID", contentId: "article-1" }).success,
    false,
  );
  assert.equal(
    contentLikeSchema.safeParse({ contentType: ContentType.EVENT, contentId: " " }).success,
    false,
  );
});
