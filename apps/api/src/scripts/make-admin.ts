/**
 * Bootstrap the first admin: `npm run make-admin -- someone@example.com`
 *
 * The chicken-and-egg problem: only admins can promote users, so who promotes the first one?
 * Answer: someone with direct access to the server/database runs this script.
 * The person registers normally first (so their password never passes through this script),
 * then this promotes that account to an active ADMIN.
 */
import { emailSchema } from '@crisislink/shared';
import { prisma } from '../db';

const parsed = emailSchema.safeParse(process.argv[2]);
if (!parsed.success) {
  console.error('Usage: npm run make-admin -- <email of a registered user>');
  process.exit(1);
}

try {
  const user = await prisma.user.update({
    where: { email: parsed.data },
    data: { role: 'ADMIN', status: 'ACTIVE' },
    select: { email: true, fullName: true },
  });
  console.log(`${user.fullName} <${user.email}> is now an ACTIVE ADMIN.`);
} catch {
  console.error(`No user with email ${parsed.data}. Register first, then run this again.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
