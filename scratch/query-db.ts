import { prisma } from "../lib/prisma";

async function main() {
  try {
    const totalPending = await prisma.schedule.count({
      where: { status: "PENDING" }
    });
    console.log("Total PENDING schedules in DB:", totalPending);

    const pending = await prisma.schedule.findMany({
      where: { status: "PENDING" },
      orderBy: { scheduledAt: "asc" },
      take: 10,
      include: {
        post: {
          select: {
            title: true,
            status: true,
          }
        }
      }
    });

    console.log("Next 10 PENDING schedules:");
    console.dir(pending, { depth: null });
  } catch (error) {
    console.error("Error querying DB:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
