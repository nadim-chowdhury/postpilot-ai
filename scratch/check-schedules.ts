import "dotenv/config";
import { prisma } from '../lib/prisma';

async function main() {
  console.log("Fetching completed schedules to analyze publication delays...");
  const completed = await prisma.schedule.findMany({
    where: {
      status: "COMPLETED",
    },
    orderBy: {
      scheduledAt: 'desc'
    },
    take: 10,
    include: {
      post: true
    }
  });

  console.log("Analysis of last 10 completed schedules:");
  for (const s of completed) {
    if (s.publishedAt) {
      const scheduled = s.scheduledAt.getTime();
      const published = s.publishedAt.getTime();
      const delayMinutes = (published - scheduled) / (1000 * 60);
      console.log(`- Post: "${s.post.title}"`);
      console.log(`  Scheduled: ${s.scheduledAt.toISOString()}`);
      console.log(`  Published: ${s.publishedAt.toISOString()}`);
      console.log(`  Delay:     ${delayMinutes.toFixed(2)} minutes`);
      console.log(`  QStash ID: ${s.qstashMsgId || 'None'}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
