import fs from "fs";
import path from "path";

// load env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      if (key && !key.startsWith("#")) {
        process.env[key] = value;
      }
    }
  });
}

async function run() {
  const { prisma } = await import("../lib/prisma");
  console.log("Connecting to database...");
  const pagesCount = await prisma.fbPage.count();
  const postsCount = await prisma.post.count();
  const schedulesCount = await prisma.schedule.count();
  console.log(`Pages count: ${pagesCount}`);
  console.log(`Posts count: ${postsCount}`);
  console.log(`Schedules count: ${schedulesCount}`);
  
  if (postsCount > 0) {
    const posts = await prisma.post.findMany({ take: 5 });
    console.log("Recent posts:", posts.map(p => ({ id: p.id, title: p.title, status: p.status })));
  }
  if (schedulesCount > 0) {
    const schedules = await prisma.schedule.findMany({ take: 5 });
    console.log("Recent schedules:", schedules.map(s => ({ id: s.id, status: s.status, scheduledAt: s.scheduledAt })));
  }

  await prisma.$disconnect();
}

run().catch(console.error);
