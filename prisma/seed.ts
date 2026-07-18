import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  CategoryType,
  ContentStatus,
  EventStatus,
  PrismaClient,
  SubscriberStatus,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function getSeedPassword() {
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD must be set before running prisma db seed.",
    );
  }

  return seedPassword;
}

async function main() {
  const passwordHash = await hash(getSeedPassword(), 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@example.test" },
    update: {
      name: "Development Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Development Super Admin",
      email: "admin@example.test",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@example.test" },
    update: {
      name: "Development Editor",
      passwordHash,
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
    },
    create: {
      name: "Development Editor",
      email: "editor@example.test",
      passwordHash,
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
    },
  });

  const categories = await Promise.all(
    (
      [
      ["Community News", "community-news", CategoryType.NEWS],
      ["Education", "education", CategoryType.GENERAL],
      ["Events", "events", CategoryType.EVENT],
      ["Magazine", "magazine", CategoryType.MAGAZINE],
      ["Announcements", "announcements", CategoryType.GENERAL],
      ] satisfies Array<[string, string, CategoryType]>
    ).map(([name, slug, type]) =>
      prisma.category.upsert({
        where: { slug },
        update: { name, type, isActive: true },
        create: {
          name,
          slug,
          type,
          isActive: true,
          description: `Development category for ${name}.`,
        },
      }),
    ),
  );

  const tags = await Promise.all(
    (
      [
      ["Faith", "faith"],
      ["Community", "community"],
      ["Youth", "youth"],
      ["Learning", "learning"],
      ["Publication", "publication"],
      ["Conference", "conference"],
      ] satisfies Array<[string, string]>
    ).map(([name, slug]) =>
      prisma.tag.upsert({
        where: { slug },
        update: { name, isActive: true },
        create: {
          name,
          slug,
          isActive: true,
          description: `Development tag for ${name}.`,
        },
      }),
    ),
  );

  const [newsCategory, educationCategory, eventsCategory, magazineCategory] =
    categories;
  const [faithTag, communityTag, youthTag, learningTag, publicationTag] = tags;

  await Promise.all(
    Array.from({ length: 5 }, (_, index) => {
      const articleNumber = index + 1;

      return prisma.newsArticle.upsert({
        where: { slug: `development-news-${articleNumber}` },
        update: {
          title: `Development News ${articleNumber}`,
          status: ContentStatus.PUBLISHED,
          authorId: index % 2 === 0 ? superAdmin.id : editor.id,
          categoryId: index % 2 === 0 ? newsCategory.id : educationCategory.id,
        },
        create: {
          title: `Development News ${articleNumber}`,
          slug: `development-news-${articleNumber}`,
          excerpt: `Short fake excerpt for development news ${articleNumber}.`,
          content: `Fake development content for news article ${articleNumber}.`,
          coverImageUrl: `https://example.test/images/news-${articleNumber}.jpg`,
          coverImageAlt: `Development news ${articleNumber} cover`,
          status: ContentStatus.PUBLISHED,
          featured: articleNumber === 1,
          publishedAt: new Date(Date.UTC(2026, 0, articleNumber)),
          authorId: index % 2 === 0 ? superAdmin.id : editor.id,
          categoryId: index % 2 === 0 ? newsCategory.id : educationCategory.id,
          tags: {
            create: [
              { tagId: articleNumber % 2 === 0 ? learningTag.id : faithTag.id },
              { tagId: communityTag.id },
            ],
          },
        },
      });
    }),
  );

  await Promise.all(
    Array.from({ length: 3 }, (_, index) => {
      const eventNumber = index + 1;

      return prisma.event.upsert({
        where: { slug: `development-event-${eventNumber}` },
        update: {
          title: `Development Event ${eventNumber}`,
          status: EventStatus.PUBLISHED,
          authorId: editor.id,
          categoryId: eventsCategory.id,
        },
        create: {
          title: `Development Event ${eventNumber}`,
          slug: `development-event-${eventNumber}`,
          summary: `Short fake summary for development event ${eventNumber}.`,
          content: `Fake development event details ${eventNumber}.`,
          location: eventNumber === 2 ? null : "Development Hall",
          isOnline: eventNumber === 2,
          onlineUrl: eventNumber === 2 ? "https://example.test/events/live" : null,
          registrationUrl: "https://example.test/register",
          startAt: new Date(Date.UTC(2026, 1, eventNumber, 9)),
          endAt: new Date(Date.UTC(2026, 1, eventNumber, 11)),
          capacity: 100 + eventNumber,
          status: EventStatus.PUBLISHED,
          featured: eventNumber === 1,
          publishedAt: new Date(Date.UTC(2026, 0, eventNumber)),
          authorId: editor.id,
          categoryId: eventsCategory.id,
          tags: {
            create: [{ tagId: youthTag.id }, { tagId: communityTag.id }],
          },
        },
      });
    }),
  );

  await Promise.all(
    Array.from({ length: 3 }, (_, index) => {
      const issueNumber = index + 1;

      return prisma.magazineIssue.upsert({
        where: { slug: `development-magazine-${issueNumber}` },
        update: {
          title: `Development Magazine Issue ${issueNumber}`,
          status: ContentStatus.PUBLISHED,
          authorId: superAdmin.id,
          categoryId: magazineCategory.id,
        },
        create: {
          title: `Development Magazine Issue ${issueNumber}`,
          slug: `development-magazine-${issueNumber}`,
          issueNumber: `DEV-${issueNumber}`,
          volume: "Development Volume 1",
          description: `Fake development magazine issue ${issueNumber}.`,
          coverImageUrl: `https://example.test/images/magazine-${issueNumber}.jpg`,
          coverImageAlt: `Development magazine ${issueNumber} cover`,
          pdfUrl: `https://example.test/pdfs/magazine-${issueNumber}.pdf`,
          pdfFileName: `development-magazine-${issueNumber}.pdf`,
          pdfFileSize: 1024 * 1024 * issueNumber,
          pageCount: 24 + issueNumber,
          publicationDate: new Date(Date.UTC(2026, 2, issueNumber)),
          status: ContentStatus.PUBLISHED,
          featured: issueNumber === 1,
          authorId: superAdmin.id,
          categoryId: magazineCategory.id,
          tags: {
            create: [{ tagId: publicationTag.id }, { tagId: faithTag.id }],
          },
        },
      });
    }),
  );

  await Promise.all(
    (
      [
      ["Amina Example", "amina@example.test", "General question"],
      ["Yusuf Example", "yusuf@example.test", "Magazine inquiry"],
      ["Mariam Example", "mariam@example.test", "Event question"],
      ] satisfies Array<[string, string, string]>
    ).map(([name, email, subject]) =>
      prisma.contactMessage.upsert({
        where: { id: `seed-contact-${email}` },
        update: { name, email, subject },
        create: {
          id: `seed-contact-${email}`,
          name,
          email,
          subject,
          message: `Fake development contact message from ${name}.`,
        },
      }),
    ),
  );

  await Promise.all(
    (
      [
      ["subscriber-one@example.test", "Subscriber One"],
      ["subscriber-two@example.test", "Subscriber Two"],
      ["subscriber-three@example.test", "Subscriber Three"],
      ] satisfies Array<[string, string]>
    ).map(([email, name]) =>
      prisma.subscriber.upsert({
        where: { email },
        update: { name, status: SubscriberStatus.ACTIVE },
        create: {
          email,
          name,
          status: SubscriberStatus.ACTIVE,
          verifiedAt: new Date(),
        },
      }),
    ),
  );

  await Promise.all(
    (
      [
      ["site.name", "APOLOGETICS መፅሔት", "general", true],
      ["site.description", "Islamic news and publishing platform.", "general", true],
      ["contact.email", "contact@example.test", "contact", true],
      ["uploads.provider", "local", "uploads", false],
      ] satisfies Array<[string, string, string, boolean]>
    ).map(([key, value, group, isPublic]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value, group, isPublic },
        create: {
          key,
          value,
          group,
          isPublic,
          description: `Development setting for ${key}.`,
        },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
