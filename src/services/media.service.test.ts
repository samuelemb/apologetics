import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

import {
  ContentStatus,
  EventStatus,
  MediaAssetKind,
  MediaAssetStatus,
  UserRole,
  UserStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { eventFormSchema, type EventFormInput } from "@/schemas/event";
import { magazineFormSchema, type MagazineFormInput } from "@/schemas/magazine";
import { newsFormSchema, type NewsFormInput } from "@/schemas/news";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "@/services/event.service";
import {
  createMagazineIssue,
  MagazineServiceError,
  updateMagazineIssue,
} from "@/services/magazine.service";
import {
  cleanupStaleMediaAssets,
  discardPendingMediaAsset,
  finalizeOrphanedMediaAsset,
  recordCompletedUpload,
} from "@/services/media.service";
import {
  createNews,
  getNewsForEdit,
  NewsServiceError,
  updateNews,
} from "@/services/news.service";
import type { MediaActor, MediaFormAsset } from "@/types/media";

const marker = `phase-13-${randomUUID()}`;
const assetIds = new Set<string>();
const providerKeys = new Set<string>();
const contentIds = new Set<string>();

let authorOne: MediaActor;
let authorTwo: MediaActor;
let editor: MediaActor;
let admin: MediaActor;
let pendingNewsAsset: MediaFormAsset;
let managedNewsId: string;
let managedNewsAssetId: string;
let managedEventId: string;
let managedMagazineId: string;
let managedMagazineCoverAssetId: string;
let managedMagazinePdfAssetId: string;

const remoteDeleteSuccess = async () => undefined;

function actorInput(id: string, role: UserRole): MediaActor {
  return { id, role };
}

async function createAsset(
  uploader: MediaActor,
  kind: MediaAssetKind,
  suffix: string,
): Promise<MediaFormAsset> {
  const isPdf = kind === MediaAssetKind.MAGAZINE_PDF;
  const extension = isPdf ? "pdf" : "jpg";
  const mimeType = isPdf ? "application/pdf" : "image/jpeg";
  const fileKey = `${marker}-${suffix}-${randomUUID()}`;
  providerKeys.add(fileKey);
  const asset = await recordCompletedUpload({
    fileKey,
    url: `https://phase-13.ufs.sh/f/${fileKey}`,
    originalName: `${marker}-${suffix}.${extension}`,
    mimeType,
    sizeBytes: isPdf ? 2_000_000 : 500_000,
    kind,
    uploadedById: uploader.id,
  });
  assetIds.add(asset.id);
  return asset;
}

function newsInput(
  suffix: string,
  overrides: Partial<NewsFormInput> = {},
): NewsFormInput {
  return newsFormSchema.parse({
    title: `${marker} ${suffix}`,
    slug: `${marker}-${suffix}`,
    excerpt: "Temporary media test article",
    content: "Temporary media test article content",
    coverImageUrl: "",
    coverImageAssetId: "",
    coverImageAlt: "",
    categoryId: "",
    tagIds: [],
    status: ContentStatus.DRAFT,
    featured: false,
    publishedAt: "",
    scheduledFor: "",
    ...overrides,
  });
}

function eventInput(
  suffix: string,
  overrides: Partial<EventFormInput> = {},
): EventFormInput {
  return eventFormSchema.parse({
    title: `${marker} ${suffix}`,
    slug: `${marker}-${suffix}`,
    summary: "Temporary media test event",
    content: "Temporary media test event content",
    coverImageUrl: "",
    coverImageAssetId: "",
    coverImageAlt: "",
    categoryId: "",
    tagIds: [],
    status: EventStatus.DRAFT,
    featured: false,
    startAt: "2035-07-20T09:00",
    endAt: "2035-07-20T11:00",
    location: "Addis Ababa",
    isOnline: false,
    onlineUrl: "",
    registrationUrl: "",
    registrationDeadline: "",
    capacity: "",
    publishedAt: "",
    scheduledFor: "",
    ...overrides,
  });
}

function magazineInput(
  suffix: string,
  overrides: Partial<MagazineFormInput> = {},
): MagazineFormInput {
  return magazineFormSchema.parse({
    title: `${marker} ${suffix}`,
    slug: `${marker}-${suffix}`,
    issueNumber: `${marker}-${suffix}`,
    volume: "Test volume",
    description: "Temporary media test issue",
    coverImageUrl: "",
    coverImageAssetId: "",
    coverImageAlt: "",
    pdfUrl: `https://example.test/${marker}/${suffix}.pdf`,
    pdfAssetId: "",
    pdfFileName: `${suffix}.pdf`,
    pdfFileSize: "2000000",
    pageCount: "12",
    publicationDate: "",
    categoryId: "",
    tagIds: [],
    status: ContentStatus.DRAFT,
    featured: false,
    ...overrides,
  });
}

before(async () => {
  const users = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: "Phase 13 Author One",
        email: `author-one.${marker}@example.test`,
        passwordHash: "test-fixture-not-for-login",
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.user.create({
      data: {
        name: "Phase 13 Author Two",
        email: `author-two.${marker}@example.test`,
        passwordHash: "test-fixture-not-for-login",
        role: UserRole.AUTHOR,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.user.create({
      data: {
        name: "Phase 13 Editor",
        email: `editor.${marker}@example.test`,
        passwordHash: "test-fixture-not-for-login",
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
    prisma.user.create({
      data: {
        name: "Phase 13 Admin",
        email: `admin.${marker}@example.test`,
        passwordHash: "test-fixture-not-for-login",
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    }),
  ]);

  authorOne = actorInput(users[0].id, UserRole.AUTHOR);
  authorTwo = actorInput(users[1].id, UserRole.AUTHOR);
  editor = actorInput(users[2].id, UserRole.EDITOR);
  admin = actorInput(users[3].id, UserRole.ADMIN);
});

after(async () => {
  await prisma.newsArticle.deleteMany({ where: { slug: { startsWith: marker } } });
  await prisma.event.deleteMany({ where: { slug: { startsWith: marker } } });
  await prisma.magazineIssue.deleteMany({ where: { slug: { startsWith: marker } } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { userId: { in: [authorOne.id, authorTwo.id, editor.id, admin.id] } },
        { entityId: { in: [...assetIds, ...contentIds] } },
      ],
    },
  });
  await prisma.mediaAsset.deleteMany({ where: { id: { in: [...assetIds] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [authorOne.id, authorTwo.id, editor.id, admin.id] } },
  });
  await prisma.$disconnect();
});

test("17. completed upload creates a PENDING MediaAsset", async () => {
  pendingNewsAsset = await createAsset(
    authorOne,
    MediaAssetKind.NEWS_COVER,
    "pending-news",
  );
  assert.equal(pendingNewsAsset.status, MediaAssetStatus.PENDING);
  const stored = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: pendingNewsAsset.id },
    select: { uploadedById: true, status: true },
  });
  assert.equal(stored.uploadedById, authorOne.id);
  assert.equal(stored.status, MediaAssetStatus.PENDING);
});

test("18. provider file key is unique and callback tracking is idempotent", async () => {
  const fileKey = `${marker}-unique-key`;
  providerKeys.add(fileKey);
  const input = {
    fileKey,
    url: `https://phase-13.ufs.sh/f/${fileKey}`,
    originalName: `${marker}-unique.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 400_000,
    kind: MediaAssetKind.NEWS_COVER,
    uploadedById: authorOne.id,
  };
  const first = await recordCompletedUpload(input);
  const second = await recordCompletedUpload(input);
  assetIds.add(first.id);
  assert.equal(first.id, second.id);
  assert.equal(await prisma.mediaAsset.count({ where: { fileKey } }), 1);
});

test("19. attaching an asset marks it ATTACHED", async () => {
  const article = await createNews(
    authorOne,
    newsInput("managed-news", {
      coverImageUrl: "https://malicious.example.test/untrusted.jpg",
      coverImageAssetId: pendingNewsAsset.id,
      coverImageAlt: "Trusted media fixture",
    }),
  );
  managedNewsId = article.id;
  managedNewsAssetId = pendingNewsAsset.id;
  contentIds.add(article.id);
  const stored = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: pendingNewsAsset.id },
    select: { status: true, attachedAt: true },
  });
  assert.equal(stored.status, MediaAssetStatus.ATTACHED);
  assert.ok(stored.attachedAt);
});

test("20. attachment populates trusted URL metadata", async () => {
  const article = await prisma.newsArticle.findUniqueOrThrow({
    where: { id: managedNewsId },
    select: { coverImageUrl: true, coverImageAssetId: true },
  });
  assert.equal(article.coverImageUrl, pendingNewsAsset.url);
  assert.equal(article.coverImageAssetId, pendingNewsAsset.id);
  assert.notEqual(article.coverImageUrl, "https://malicious.example.test/untrusted.jpg");
});

test("21. an image asset cannot be attached as a PDF", async () => {
  const image = await createAsset(
    authorOne,
    MediaAssetKind.MAGAZINE_COVER,
    "image-as-pdf",
  );
  await assert.rejects(
    () =>
      createMagazineIssue(
        authorOne,
        magazineInput("image-as-pdf", {
          pdfUrl: "",
          pdfAssetId: image.id,
          pdfFileName: "",
          pdfFileSize: "",
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof MagazineServiceError);
      assert.equal(error.code, "INVALID_MEDIA");
      return true;
    },
  );
});

test("22. a PDF asset cannot be attached as a cover image", async () => {
  const pdf = await createAsset(
    authorOne,
    MediaAssetKind.MAGAZINE_PDF,
    "pdf-as-cover",
  );
  await assert.rejects(
    () =>
      createNews(
        authorOne,
        newsInput("pdf-as-cover", {
          coverImageAssetId: pdf.id,
          coverImageAlt: "Invalid PDF cover",
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof NewsServiceError);
      assert.equal(error.code, "INVALID_MEDIA");
      return true;
    },
  );
});

test("23. attached asset cannot be reused for unrelated content", async () => {
  await assert.rejects(
    () =>
      createNews(
        authorOne,
        newsInput("reused-cover", {
          coverImageAssetId: managedNewsAssetId,
          coverImageAlt: "Reused cover",
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof NewsServiceError);
      assert.equal(error.code, "INVALID_MEDIA");
      return true;
    },
  );
});

test("24. News image replacement preserves the new asset", async () => {
  const replacement = await createAsset(
    authorOne,
    MediaAssetKind.NEWS_COVER,
    "news-replacement",
  );
  await updateNews(
    authorOne,
    managedNewsId,
    newsInput("managed-news-updated", {
      coverImageAssetId: replacement.id,
      coverImageAlt: "Replacement news cover",
    }),
  );
  managedNewsAssetId = replacement.id;
  const article = await prisma.newsArticle.findUniqueOrThrow({
    where: { id: managedNewsId },
    select: { coverImageAssetId: true, coverImageUrl: true },
  });
  assert.equal(article.coverImageAssetId, replacement.id);
  assert.equal(article.coverImageUrl, replacement.url);
});

test("25. Event image replacement preserves the new asset", async () => {
  const original = await createAsset(
    authorOne,
    MediaAssetKind.EVENT_COVER,
    "event-original",
  );
  const event = await createEvent(
    authorOne,
    eventInput("managed-event", {
      coverImageAssetId: original.id,
      coverImageAlt: "Event cover",
    }),
  );
  managedEventId = event.id;
  contentIds.add(event.id);
  const replacement = await createAsset(
    authorOne,
    MediaAssetKind.EVENT_COVER,
    "event-replacement",
  );
  await updateEvent(
    authorOne,
    event.id,
    eventInput("managed-event-updated", {
      coverImageAssetId: replacement.id,
      coverImageAlt: "Replacement event cover",
    }),
  );
  const stored = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
    select: { coverImageAssetId: true, coverImageUrl: true },
  });
  assert.equal(stored.coverImageAssetId, replacement.id);
  assert.equal(stored.coverImageUrl, replacement.url);
});

test("26. Magazine cover replacement preserves the new asset", async () => {
  const originalCover = await createAsset(
    editor,
    MediaAssetKind.MAGAZINE_COVER,
    "magazine-cover-original",
  );
  const originalPdf = await createAsset(
    editor,
    MediaAssetKind.MAGAZINE_PDF,
    "magazine-pdf-original",
  );
  const issue = await createMagazineIssue(
    editor,
    magazineInput("managed-magazine", {
      coverImageAssetId: originalCover.id,
      coverImageAlt: "Magazine cover",
      pdfUrl: "",
      pdfAssetId: originalPdf.id,
      pdfFileName: "",
      pdfFileSize: "",
    }),
  );
  managedMagazineId = issue.id;
  managedMagazinePdfAssetId = originalPdf.id;
  contentIds.add(issue.id);
  await prisma.magazineIssue.update({
    where: { id: issue.id },
    data: { viewCount: 9, downloadCount: 4 },
  });
  const replacementCover = await createAsset(
    editor,
    MediaAssetKind.MAGAZINE_COVER,
    "magazine-cover-replacement",
  );
  await updateMagazineIssue(
    editor,
    issue.id,
    magazineInput("managed-magazine-updated-cover", {
      issueNumber: `${marker}-managed-magazine`,
      coverImageAssetId: replacementCover.id,
      coverImageAlt: "Replacement magazine cover",
      pdfUrl: "",
      pdfAssetId: originalPdf.id,
      pdfFileName: "",
      pdfFileSize: "",
    }),
  );
  managedMagazineCoverAssetId = replacementCover.id;
  const stored = await prisma.magazineIssue.findUniqueOrThrow({
    where: { id: issue.id },
    select: { coverImageAssetId: true, coverImageUrl: true },
  });
  assert.equal(stored.coverImageAssetId, replacementCover.id);
  assert.equal(stored.coverImageUrl, replacementCover.url);
});

test("27. Magazine PDF replacement preserves the new asset", async () => {
  const replacementPdf = await createAsset(
    editor,
    MediaAssetKind.MAGAZINE_PDF,
    "magazine-pdf-replacement",
  );
  await updateMagazineIssue(
    editor,
    managedMagazineId,
    magazineInput("managed-magazine-updated-pdf", {
      issueNumber: `${marker}-managed-magazine`,
      coverImageAssetId: managedMagazineCoverAssetId,
      coverImageAlt: "Replacement magazine cover",
      pdfUrl: "",
      pdfAssetId: replacementPdf.id,
      pdfFileName: "",
      pdfFileSize: "",
    }),
  );
  managedMagazinePdfAssetId = replacementPdf.id;
  const stored = await prisma.magazineIssue.findUniqueOrThrow({
    where: { id: managedMagazineId },
    select: { pdfAssetId: true, pdfUrl: true, pdfFileName: true, pdfFileSize: true },
  });
  assert.equal(stored.pdfAssetId, replacementPdf.id);
  assert.equal(stored.pdfUrl, replacementPdf.url);
  assert.equal(stored.pdfFileName, replacementPdf.originalName);
  assert.equal(stored.pdfFileSize, replacementPdf.sizeBytes);
});

test("28. counters remain unchanged during magazine asset edits", async () => {
  const counters = await prisma.magazineIssue.findUniqueOrThrow({
    where: { id: managedMagazineId },
    select: { viewCount: true, downloadCount: true },
  });
  assert.deepEqual(counters, { viewCount: 9, downloadCount: 4 });
});

test("29. existing external URL content continues to work", async () => {
  const issue = await createMagazineIssue(
    authorTwo,
    magazineInput("external-urls", {
      coverImageUrl: "https://example.test/external-cover.jpg",
      coverImageAlt: "External cover",
      pdfUrl: "https://example.test/external-issue.pdf",
      pdfFileName: "external-issue.pdf",
    }),
  );
  contentIds.add(issue.id);
  const stored = await prisma.magazineIssue.findUniqueOrThrow({
    where: { id: issue.id },
    select: { coverImageAssetId: true, coverImageUrl: true, pdfAssetId: true, pdfUrl: true },
  });
  assert.equal(stored.coverImageAssetId, null);
  assert.equal(stored.pdfAssetId, null);
  assert.equal(stored.coverImageUrl, "https://example.test/external-cover.jpg");
  assert.equal(stored.pdfUrl, "https://example.test/external-issue.pdf");
});

test("30. discarding a pending asset marks it deleted", async () => {
  const pending = await createAsset(
    authorOne,
    MediaAssetKind.NEWS_COVER,
    "discarded",
  );
  await discardPendingMediaAsset(authorOne, pending.id, remoteDeleteSuccess);
  const stored = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: pending.id },
    select: { status: true, deletedAt: true },
  });
  assert.equal(stored.status, MediaAssetStatus.DELETED);
  assert.ok(stored.deletedAt);
});

test("31. cleanup ignores attached assets", async () => {
  await cleanupStaleMediaAssets({ dryRun: false, remoteDelete: remoteDeleteSuccess });
  const result = await cleanupStaleMediaAssets({ dryRun: true });
  const attached = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: managedMagazinePdfAssetId },
    select: { status: true },
  });
  assert.equal(attached.status, MediaAssetStatus.ATTACHED);
  assert.equal(result.candidates, 0);
});

test("32. cleanup finds expired pending assets", async () => {
  const expired = await createAsset(
    authorOne,
    MediaAssetKind.NEWS_COVER,
    "expired",
  );
  await prisma.mediaAsset.update({
    where: { id: expired.id },
    data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
  });
  const dryRun = await cleanupStaleMediaAssets({ dryRun: true });
  assert.ok(dryRun.candidates >= 1);
  await cleanupStaleMediaAssets({ dryRun: false, remoteDelete: remoteDeleteSuccess });
  assert.equal(
    await prisma.mediaAsset.findUniqueOrThrow({ where: { id: expired.id } }).then((asset) => asset.status),
    MediaAssetStatus.DELETED,
  );
});

test("33. deleting content does not delete unrelated files", async () => {
  const unrelated = await createAsset(
    authorTwo,
    MediaAssetKind.EVENT_COVER,
    "unrelated",
  );
  await deleteEvent(admin, managedEventId);
  const stored = await prisma.mediaAsset.findUniqueOrThrow({
    where: { id: unrelated.id },
    select: { status: true },
  });
  assert.equal(stored.status, MediaAssetStatus.PENDING);
  assert.equal(await prisma.event.count({ where: { id: managedEventId } }), 0);
});

test("34. safe audit records are created for media lifecycle actions", async () => {
  const deletable = await createAsset(
    admin,
    MediaAssetKind.NEWS_COVER,
    "audited-delete",
  );
  await prisma.mediaAsset.update({
    where: { id: deletable.id },
    data: { status: MediaAssetStatus.ORPHANED },
  });
  await finalizeOrphanedMediaAsset(deletable.id, {
    actorId: admin.id,
    remoteDelete: remoteDeleteSuccess,
  });
  const logs = await prisma.auditLog.findMany({
    where: { userId: { in: [authorOne.id, authorTwo.id, editor.id, admin.id] } },
    select: { action: true },
  });
  const actions = new Set(logs.map((log) => log.action));
  for (const action of [
    "MEDIA_UPLOADED",
    "MEDIA_ATTACHED",
    "MEDIA_REPLACED",
    "MEDIA_DISCARDED",
    "MEDIA_DELETED",
    "MEDIA_DELETE_FAILED",
  ]) {
    assert.equal(actions.has(action), true, `${action} audit log is required`);
  }
});

test("35. audit metadata contains no tokens, keys, or secrets", async () => {
  const logs = await prisma.auditLog.findMany({
    where: { userId: { in: [authorOne.id, authorTwo.id, editor.id, admin.id] } },
    select: { metadata: true },
  });
  const serialized = JSON.stringify(logs);
  assert.doesNotMatch(serialized, /UPLOADTHING_TOKEN|AUTH_SECRET|passwordHash|fileKey/i);
  for (const fileKey of providerKeys) {
    assert.equal(serialized.includes(fileKey), false);
  }
});

test("36. browser-facing form data contains no provider tokens or server secrets", async () => {
  const editValues = await getNewsForEdit(managedNewsId);
  assert.ok(editValues);
  const serialized = JSON.stringify(editValues);
  assert.doesNotMatch(serialized, /UPLOADTHING_TOKEN|AUTH_SECRET|passwordHash|"fileKey"/i);
  if (process.env.UPLOADTHING_TOKEN) {
    assert.equal(serialized.includes(process.env.UPLOADTHING_TOKEN), false);
  }
});
