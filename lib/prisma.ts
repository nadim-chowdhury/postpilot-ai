import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function logEnvironmentDiagnostic() {
  console.log("=== [PostPilot AI] Environment Diagnostics ===");
  console.log(`NODE_ENV:                   ${process.env.NODE_ENV}`);
  console.log(`NEXT_PUBLIC_APP_URL:        ${process.env.NEXT_PUBLIC_APP_URL}`);
  console.log(`NEXTAUTH_URL:               ${process.env.NEXTAUTH_URL}`);
  console.log(`DATABASE_URL:               ${process.env.DATABASE_URL ? "SET (length: " + process.env.DATABASE_URL.length + ")" : "MISSING"}`);
  console.log(`NEXTAUTH_SECRET:            ${process.env.NEXTAUTH_SECRET ? "SET" : "MISSING"}`);
  console.log(`META_APP_ID:                ${process.env.META_APP_ID}`);
  console.log(`META_APP_SECRET:            ${process.env.META_APP_SECRET ? "SET" : "MISSING"}`);
  console.log(`QSTASH_TOKEN:               ${process.env.QSTASH_TOKEN ? "SET (length: " + process.env.QSTASH_TOKEN.length + ")" : "MISSING"}`);
  console.log(`QSTASH_CURRENT_SIGNING_KEY: ${process.env.QSTASH_CURRENT_SIGNING_KEY ? "SET" : "MISSING"}`);
  console.log(`QSTASH_NEXT_SIGNING_KEY:    ${process.env.QSTASH_NEXT_SIGNING_KEY ? "SET" : "MISSING"}`);
  console.log(`ENCRYPTION_KEY:             ${process.env.ENCRYPTION_KEY ? "SET" : "MISSING"}`);
  console.log(`CRON_SECRET:                ${process.env.CRON_SECRET ? "SET" : "MISSING"}`);
  console.log("=============================================");
}

function createPrismaClient() {
  logEnvironmentDiagnostic();
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
          try {
            // Mark as IN_PROGRESS to prevent concurrent executions
            await client.schedule.update({
              where: { id: schedule.id },
              data: { status: "IN_PROGRESS" },
            });

            // Dynamically import to avoid circular dependency
            const { publishPostNowInternal } = await import("@/actions/post.actions");
            const result = await publishPostNowInternal(schedule.postId);

            if (result.success) {
              await client.schedule.update({
                where: { id: schedule.id },
                data: {
                  status: "COMPLETED",
                  publishedAt: new Date(),
                  errorMessage: null,
                },
              });
              console.log(`[Dev Scheduler] Successfully published schedule ${schedule.id}`);
            } else {
              throw new Error(result.error || "Publishing action failed");
            }
          } catch (err) {
            console.error(`[Dev Scheduler] Failed to publish schedule ${schedule.id}:`, err);
            const errorMessage = (err as Error).message || "Unknown error";
            const { autoRescheduleFailedPost } = await import("@/actions/schedule.actions");
            await autoRescheduleFailedPost(
              schedule.id,
              schedule.fbPageId,
              schedule.postId,
              `Dev scheduler recovery failed: ${errorMessage}`
            );
          }
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

