"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        console.log('🧹 DYNAMIC DATABASE WIPE: Clearing all tables to start fresh on Railway...');
        // 1. Disable FK checks
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
        // 2. Query all table names dynamically from database schema
        const tablesResult = await prisma.$queryRawUnsafe('SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE();');
        console.log(`Found ${tablesResult.length} tables in database.`);
        for (const row of tablesResult) {
            const tableName = row.tableName || row.TABLE_NAME || row.table_name;
            // Skip Prisma migrations table to keep tracking intact
            if (tableName && tableName !== '_prisma_migrations') {
                try {
                    await prisma.$executeRawUnsafe(`DELETE FROM \`${tableName}\`;`);
                    console.log(`✅ Cleared table: ${tableName}`);
                }
                catch (err) {
                    console.log(`ℹ️ Table ${tableName} skipped (details: ${err.message})`);
                }
            }
        }
        // 3. Enable FK checks
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
        console.log('🎉 Dynamic database wipe completed successfully!');
    }
    catch (error) {
        console.error('⚠️ Error: Dynamic database wipe failed:', error.message);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
