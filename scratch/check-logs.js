// load env variables first since Prisma Pg adapter connection string requires DATABASE_URL
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.activityLog.count();
  console.log("ActivityLog Count:", count);
  
  const sample = await prisma.activityLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" }
  });
  console.log("Sample logs:", JSON.stringify(sample, null, 2));

  const users = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  console.log("Users in DB:", users);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
