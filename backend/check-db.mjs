import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const users = await p.user.findMany({
  select: { email: true, name: true, isActive: true, isSuperAdmin: true },
  orderBy: { createdAt: 'desc' },
  take: 20
});
console.log('=== USERS ===');
console.log(JSON.stringify(users, null, 2));

const orgs = await p.organization.findMany({
  select: { id: true, name: true, enabledModules: true, plan: true },
  orderBy: { createdAt: 'desc' },
  take: 10
});
console.log('\n=== ORGS ===');
console.log(JSON.stringify(orgs, null, 2));

const members = await p.organizationMember.findMany({
  include: { user: { select: { email: true, name: true } } },
  orderBy: { joinedAt: 'desc' }
});
console.log('\n=== MEMBERS ===');
console.log(JSON.stringify(members, null, 2));

const invites = await p.organizationInvite.findMany({
  orderBy: { createdAt: 'desc' }
});
console.log('\n=== INVITES ===');
console.log(JSON.stringify(invites, null, 2));

await p.$disconnect();
