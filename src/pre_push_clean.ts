import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('🧹 Running pre-push database clean to resolve foreign key conflicts...');
    
    // 1. Disable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    
    // 2. Delete orphaned records in user_assignments
    const deletedCount = await prisma.$executeRawUnsafe(
      'DELETE FROM user_assignments WHERE userId NOT IN (SELECT id FROM users);'
    );
    
    console.log(`✅ Deleted ${deletedCount} orphaned user assignments.`);
    
    // 3. Enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('🎉 Database pre-push cleaning successful!');
  } catch (error: any) {
    console.error('⚠️ Warning: Pre-push database cleaning failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
