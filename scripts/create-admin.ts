/**
 * Crea o promueve un usuario a admin (role="admin") con la contraseña dada.
 * Uso: npx tsx scripts/create-admin.ts <email> <password>
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Uso: npx tsx scripts/create-admin.ts <email> <password>");
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", passwordHash },
    create: { email, role: "admin", passwordHash },
  });
  console.log(`Admin listo: ${user.email} (role=${user.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
