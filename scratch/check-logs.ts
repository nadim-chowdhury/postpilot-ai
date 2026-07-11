import { prisma } from "../lib/prisma";

async function main() {
  const schedules = await prisma.schedule.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      post: true
    }
  });
  console.log("Total schedules in DB:", schedules.length);
  console.log("Schedules details:");
  console.log(JSON.stringify(schedules, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
