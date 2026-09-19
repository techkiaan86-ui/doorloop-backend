import prisma from '../src/config/database';

async function cleanupDivyansh() {
  const email = 'divyanshpal@gmail.com';
  console.log('Deleting tenant & user records for:', email);

  const tenants = await prisma.tenant.findMany({ where: { email } });
  for (const t of tenants) {
    await prisma.rentPayment.deleteMany({ where: { tenantId: t.id } });
    await prisma.invoice.deleteMany({ where: { tenantId: t.id } });
    await prisma.lease.deleteMany({ where: { tenantId: t.id } });
    await prisma.charge.deleteMany({ where: { tenantId: t.id } });
    await prisma.deposit.deleteMany({ where: { tenantId: t.id } });
    await prisma.paymentPlan.deleteMany({ where: { tenantId: t.id } });
    await prisma.screeningReport.deleteMany({ where: { tenantId: t.id } });
    await prisma.insurancePolicy.deleteMany({ where: { tenantId: t.id } });
    await prisma.tenant.delete({ where: { id: t.id } });
  }

  const users = await prisma.user.findMany({ where: { email } });
  for (const u of users) {
    await prisma.auditLog.updateMany({ where: { userId: u.id }, data: { userId: null } });
    await prisma.user.delete({ where: { id: u.id } });
  }

  await prisma.companyUser.deleteMany({ where: { email } });
  await prisma.vendor.deleteMany({ where: { email } });
  await prisma.owner.deleteMany({ where: { email } });

  console.log('Cleanup completed successfully for:', email);
}

cleanupDivyansh().catch(console.error).finally(() => process.exit());
