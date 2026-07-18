import assert from "node:assert/strict";
import test from "node:test";

import { EventStatus } from "@/generated/prisma/enums";
import {
  eventFormSchema,
  eventQuerySchema,
  generateEventSlug,
  normalizeEventInput,
} from "@/schemas/event";

const baseInput = {
  title: "Community learning event",
  slug: "",
  summary: "A focused event summary",
  content: "Event details",
  coverImageUrl: "",
  coverImageAssetId: "",
  coverImageAlt: "",
  categoryId: "",
  tagIds: [] as string[],
  status: EventStatus.DRAFT,
  featured: false,
  startAt: "2035-06-10T09:00",
  endAt: "2035-06-10T11:00",
  location: "Addis Ababa",
  isOnline: false,
  onlineUrl: "",
  registrationUrl: "",
  registrationDeadline: "2035-06-09T09:00",
  capacity: "100",
  publishedAt: "",
  scheduledFor: "",
};

test("event schema accepts valid physical and online events", () => {
  assert.equal(eventFormSchema.safeParse(baseInput).success, true);
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      location: "",
      isOnline: true,
      onlineUrl: "https://example.test/event-room",
    }).success,
    true,
  );
});

test("event schema rejects invalid event date relationships", () => {
  assert.equal(
    eventFormSchema.safeParse({ ...baseInput, endAt: baseInput.startAt }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      endAt: "2035-06-10T08:59",
    }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      registrationDeadline: "2035-06-10T09:01",
    }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      startAt: "2035-02-30T09:00",
    }).success,
    false,
  );
});

test("event schema enforces physical and online locations", () => {
  assert.equal(
    eventFormSchema.safeParse({ ...baseInput, location: "" }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      location: "",
      isOnline: true,
      onlineUrl: "",
    }).success,
    false,
  );
});

test("event schema rejects invalid and non-positive capacities", () => {
  for (const capacity of ["-1", "0", "2.5", "many"]) {
    assert.equal(
      eventFormSchema.safeParse({ ...baseInput, capacity }).success,
      false,
    );
  }
});

test("scheduled publication requires a future UTC date", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);

  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      status: EventStatus.SCHEDULED,
      scheduledFor: "",
    }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      status: EventStatus.SCHEDULED,
      scheduledFor: "2020-01-01T00:00",
    }).success,
    false,
  );
  assert.equal(
    eventFormSchema.safeParse({
      ...baseInput,
      status: EventStatus.SCHEDULED,
      scheduledFor: future,
    }).success,
    true,
  );
});

test("event normalization applies publication and attendance rules", () => {
  const now = new Date("2030-01-02T03:04:05.000Z");
  const published = eventFormSchema.parse({
    ...baseInput,
    status: EventStatus.PUBLISHED,
  });
  const normalizedPublished = normalizeEventInput(published, { now });

  assert.equal(normalizedPublished.publishedAt?.toISOString(), now.toISOString());
  assert.equal(normalizedPublished.scheduledFor, null);
  assert.equal(normalizedPublished.onlineUrl, null);
  assert.equal(normalizedPublished.capacity, 100);

  const existingPublishedAt = new Date("2029-02-03T04:05:00.000Z");
  const cancelled = eventFormSchema.parse({
    ...baseInput,
    status: EventStatus.CANCELLED,
  });
  assert.equal(
    normalizeEventInput(cancelled, { existingPublishedAt }).publishedAt?.toISOString(),
    existingPublishedAt.toISOString(),
  );
});

test("event slug and query normalization are deterministic", () => {
  assert.equal(generateEventSlug(" Faith, Learning & Community "), "faith-learning-community");
  assert.equal(eventQuerySchema.safeParse({ page: "0" }).success, false);
  assert.equal(eventQuerySchema.safeParse({ status: "REMOVED" }).success, false);
  assert.equal(eventQuerySchema.safeParse({ mode: "hybrid" }).success, false);

  const query = eventQuerySchema.parse({ page: "2", mode: "online", sort: "start" });
  assert.equal(query.page, 2);
  assert.equal(query.mode, "online");
  assert.equal(query.sort, "start");
});
