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

  const users = await prisma.user.findMany();
  console.log("Users in database:", users);

  const firstUser = users[0];
  if (firstUser) {
    const pagesCount = await prisma.fbPage.count({ where: { userId: firstUser.id } });
    const postsCount = await prisma.post.count({ where: { userId: firstUser.id } });
    const schedulesCount = await prisma.schedule.count({ where: { userId: firstUser.id } });
    console.log(`First User: ${firstUser.name} (${firstUser.email}) [ID: ${firstUser.id}]`);
    console.log(`  Pages: ${pagesCount}`);
    console.log(`  Posts: ${postsCount}`);
    console.log(`  Schedules: ${schedulesCount}`);
  }

  // Count orphaned records
  const pagesWithoutUser = await prisma.fbPage.count({ where: { userId: { notIn: users.map(u => u.id) } } });
  const postsWithoutUser = await prisma.post.count({ where: { userId: { notIn: users.map(u => u.id) } } });
  const schedulesWithoutUser = await prisma.schedule.count({ where: { userId: { notIn: users.map(u => u.id) } } });
  
  console.log("Orphaned record counts (not matching any existing user):");
  console.log(`  Pages: ${pagesWithoutUser}`);
  console.log(`  Posts: ${postsWithoutUser}`);
  console.log(`  Schedules: ${schedulesWithoutUser}`);

  await prisma.$disconnect();
}

run().catch(console.error);
