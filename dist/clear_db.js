"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🧹 Starting database clear...');
    // 1. Disable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
    // 2. Fetch all tables from the database
    const tables = await prisma.$queryRawUnsafe(`SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`);
    // 3. Delete from all tables except migration history
    for (const table of tables) {
        const tableName = table.TABLE_NAME;
        if (tableName === '_prisma_migrations')
            continue;
        console.log(`Clearing table: ${tableName}`);
        await prisma.$executeRawUnsafe(`DELETE FROM \`${tableName}\`;`);
    }
    // 4. Enable FK checks
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✅ Database cleared.');
    // 5. Create/Ensure default Roles exist
    const adminRole = await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: {
            name: 'Super Admin',
            description: 'Master account with full administrative permissions.',
            isCustom: false,
        },
    });
    const roles = [
        { name: 'Property Manager', description: 'Property manager access with operational permissions.', isCustom: false },
        { name: 'Owner', description: 'Owner access to financial statements and payouts.', isCustom: false },
        { name: 'Tenant', description: 'Tenant portal access for rent payments and maintenance.', isCustom: false },
        { name: 'Maintenance Staff', description: 'Maintenance dispatcher and tech access.', isCustom: false },
        { name: 'Collection Manager', description: 'Collection manager access.', isCustom: false },
    ];
    for (const r of roles) {
        await prisma.role.upsert({
            where: { name: r.name },
            update: {},
            create: r,
        });
    }
    // 6. Create default permissions for Super Admin
    const modules = [
        'Dashboard',
        'Properties',
        'Leasing',
        'Tenants',
        'Owners',
        'Rent & Payments',
        'Accounting',
        'Maintenance',
        'Documents',
        'Reports',
        'Communication',
        'Company Settings',
    ];
    for (const moduleName of modules) {
        await prisma.permission.upsert({
            where: {
                roleId_module: {
                    roleId: adminRole.id,
                    module: moduleName,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                module: moduleName,
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canApprove: true,
                canExport: true,
            },
        });
    }
    // 7. Hash password and create/update Super Admin User
    const passwordHash = await bcrypt_1.default.hash('whatslandlord@123', 12);
    await prisma.user.upsert({
        where: { email: 'superadmin@whatslandlord.com' },
        update: {
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            roleId: adminRole.id,
            status: 'Active',
        },
        create: {
            email: 'superadmin@whatslandlord.com',
            passwordHash,
            firstName: 'Super',
            lastName: 'Admin',
            roleId: adminRole.id,
            status: 'Active',
        },
    });
    console.log('🚀 Super Admin created successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
