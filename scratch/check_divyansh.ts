import prisma from '../src/config/database';

async function checkDb() {
  const email = 'divyanshpal@gmail.com';
  console.log('--- DB CHECK FOR:', email, '---');
  
  const users = await prisma.user.findMany({
    where: { email: { equals: email } },
    include: { role: true, company: true }
  });
  console.log('USERS:', JSON.stringify(users, null, 2));

  const companies = await prisma.company.findMany({
    where: { OR: [{ email: { equals: email } }, { name: { contains: 'Divyansh' } }] }
  });
  console.log('COMPANIES:', JSON.stringify(companies, null, 2));

  const companyUsers = await prisma.companyUser.findMany({
    where: { email: { equals: email } }
  });
  console.log('COMPANY USERS:', JSON.stringify(companyUsers, null, 2));

  const owners = await prisma.owner.findMany({
    where: { email: { equals: email } }
  });
  console.log('OWNERS:', JSON.stringify(owners, null, 2));

  const tenants = await prisma.tenant.findMany({
    where: { email: { equals: email } }
  });
  console.log('TENANTS:', JSON.stringify(tenants, null, 2));
}

checkDb().catch(console.error).finally(() => process.exit());
