import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  // Start background queue processing sweeper in development/mock mode
  if (process.env.NODE_ENV === "development" || !process.env.QSTASH_TOKEN) {
    const intervalMs = 15 * 1000; // run every 15 seconds
    console.log(`[Dev Scheduler] Starting background queue sweeper (every ${intervalMs / 1000}s)`);
    setInterval(async () => {
      try {
        const now = new Date();
        const totalPending = await client.schedule.count({
          where: { status: "PENDING" }
        });
        
        console.log(`[Dev Scheduler] Sweeper checking... Now (UTC): ${now.toISOString()}. Total pending schedules: ${totalPending}`);
        
        const pendingSchedules = await client.schedule.findMany({
          where: {
            status: "PENDING",
            scheduledAt: {
              lte: now,
            },
          },
          take: 5,
        });

        if (pendingSchedules.length > 0) {
          console.log(`[Dev Scheduler] Found ${pendingSchedules.length} pending schedules ready to publish.`);
        }

        for (const schedule of pendingSchedules) {
          console.log(`[Dev Scheduler] Found pending schedule ${schedule.id} ready to publish. Triggering...`);
          const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/jobs/publish-post`;
          const res = await fetch(callbackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ scheduleId: schedule.id }),
          });
          console.log(`[Dev Scheduler] Triggered schedule ${schedule.id}, status: ${res.status}`);
        }
      } catch (err) {
        console.error(`[Dev Scheduler] Error in background sweeper:`, err);
      }
    }, intervalMs);
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Trigger hot reload of prisma client after generator run

