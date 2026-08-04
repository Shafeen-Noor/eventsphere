/**
 * Seeds a public demo event at /e/demo
 * Run: npx tsx scripts/seed-demo.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const owner =
    (await prisma.user.findFirst({
      where: { email: "demo@eventsphere.app" },
    })) ||
    (await prisma.user.create({
      data: {
        displayName: "Demo Host",
        email: "demo@eventsphere.app",
        plan: "premium",
        emailVerifiedAt: new Date(),
      },
    }));

  const existing = await prisma.event.findUnique({ where: { slug: "demo" } });
  if (existing) {
    await prisma.event.delete({ where: { id: existing.id } });
  }

  const startAt = new Date();
  startAt.setHours(startAt.getHours() - 2);
  const endAt = new Date(startAt.getTime() + 10 * 60 * 60 * 1000);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.event.create({
    data: {
      slug: "demo",
      title: "Sarah & John's Wedding",
      description:
        "One QR code. Every memory. Explore the live gallery, guestbook, votes, and feed.",
      eventType: "wedding",
      useCase: "celebration",
      atmosphere: "wedding",
      planTier: "premium",
      billingMode: "onetime",
      state: "live",
      startAt,
      endAt,
      expiresAt,
      retentionHours: 720,
      maxGuests: 200,
      maxMedia: 999999,
      maxMediaPerGuest: 100,
      guestVisibility: "all_members",
      ownerId: owner.id,
      memberships: {
        create: {
          userId: owner.id,
          role: "organizer",
          canUpload: true,
          canDownload: true,
        },
      },
      scheduleItems: {
        create: [
          { title: "Ceremony", sortOrder: 0 },
          { title: "Reception", sortOrder: 1 },
          { title: "Dance", sortOrder: 2 },
          { title: "Cake", sortOrder: 3 },
          { title: "After Party", sortOrder: 4 },
        ],
      },
      storyChapters: {
        create: [
          {
            title: "How We Met",
            body: "A rainy Tuesday and a shared umbrella.",
            sortOrder: 0,
          },
          {
            title: "The Proposal",
            body: "Under the old oak, with friends pretending not to watch.",
            sortOrder: 1,
          },
          {
            title: "Wedding Day",
            body: "You’re looking at the live event website.",
            sortOrder: 2,
          },
        ],
      },
      challenges: {
        create: [
          { title: "Find the bride" },
          { title: "Take a selfie" },
          { title: "Photo with grandparents" },
        ],
      },
      polls: {
        create: {
          kind: "prediction",
          question: "What song will everyone dance to?",
          options: {
            create: [
              { label: "September", sortOrder: 0 },
              { label: "Don't Stop Believin'", sortOrder: 1 },
              { label: "Mr. Brightside", sortOrder: 2 },
            ],
          },
        },
      },
      feedItems: {
        create: [
          {
            actorId: owner.id,
            type: "event_created",
            body: "Demo Host created the event website",
          },
          {
            type: "tip",
            body: "Scan the QR · upload a photo · leave a guestbook note",
          },
        ],
      },
    },
  });

  console.log("Demo event ready at /e/demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
