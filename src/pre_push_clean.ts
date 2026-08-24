import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('🧹 DATABASE WIPE: Clearing all tables to start fresh on Railway...');
    
    // 1. Disable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    
    const tables = [
      'saas_invoices',
      'rent_payments',
      'invoices',
      'leases',
      'move_ins',
      'move_outs',
      'lease_renewals',
      'inspection_photos',
      'inspection_items',
      'inspection_rooms',
      'inspections',
      'inspection_template_items',
      'inspection_template_rooms',
      'inspection_templates',
      'tenant_documents',
      'owner_documents',
      'documents',
      'announcements',
      'notifications',
      'ai_chat_logs',
      'bank_accounts',
      'coa_accounts',
      'journal_entry_lines',
      'journal_entries',
      'charge_installments',
      'charges',
      'deposits',
      'payment_plans',
      'insurance_policies',
      'crm_leads',
      'violations',
      'screening_reports',
      'service_requests',
      'work_orders',
      'user_assignments',
      'company_integrations',
      'company_users',
      'staff_profiles',
      'vendors',
      'tenants',
      'owners',
      'units',
      'buildings',
      'properties',
      'users',
      'companies',
      'roles',
      'permissions',
      'audit_logs'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table};`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (err: any) {
        // Table might not exist yet, skip safely
        console.log(`ℹ️ Table ${table} skipped (details: ${err.message})`);
      }
    }
    
    // 3. Enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('🎉 Database wipe completed successfully!');
  } catch (error: any) {
    console.error('⚠️ Error: Database wipe failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
