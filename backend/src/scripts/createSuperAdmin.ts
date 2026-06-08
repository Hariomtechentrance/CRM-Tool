import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = "hariom0300@gmail.com";
  const password = "Techentrance@Hariom@006@";
  const name     = "Hariom (Admin 2)";

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where:  { email },
    update: { isSuperAdmin: true, isActive: true, passwordHash: hash },
    create: {
      email,
      name,
      passwordHash: hash,
      isSuperAdmin: true,
      isActive:     true,
      isVerified:   true,
    },
  });

  console.log(`\nSuper admin created/updated:`);
  console.log(`  ID     : ${user.id}`);
  console.log(`  Email  : ${user.email}`);
  console.log(`  Name   : ${user.name}`);
  console.log(`  Admin? : ${user.isSuperAdmin}\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
