"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const nycDob_service_1 = require("../services/nycDob.service");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Starting Safe Violation Re-linking & Property Cleanup Script...');
    const propertiesWithBin = await prisma.property.findMany({
        where: {
            nycBin: { not: null },
        },
        include: {
            units: {
                include: {
                    violations: true,
                },
            },
        },
    });
    console.log(`Found ${propertiesWithBin.length} properties with nycBin assigned.`);
    for (const prop of propertiesWithBin) {
        if (!prop.nycBin)
            continue;
        const cleanBin = prop.nycBin.trim();
        if (!cleanBin)
            continue;
        console.log(`\nChecking Property ID: ${prop.id} | Name: "${prop.name}" | Address: "${prop.address}" | BIN: ${cleanBin}`);
        // Fetch actual real address from NYC DOB API for this BIN
        const results = await nycDob_service_1.nycDobService.fetchViolationsByBin(cleanBin);
        if (results.length === 0) {
            console.log(`  No DOB results returned for BIN ${cleanBin}. Skipping.`);
            continue;
        }
        const firstRes = results[0];
        const streetName = (firstRes?.street || '').trim();
        const houseNum = (firstRes?.houseNumber || '').trim();
        const fullRealAddress = (houseNum && streetName) ? `${houseNum} ${streetName}` : (streetName || '');
        if (!fullRealAddress) {
            console.log(`  Could not resolve real address for BIN ${cleanBin}. Skipping.`);
            continue;
        }
        console.log(`  Real address from NYC DOB for BIN ${cleanBin}: "${fullRealAddress}"`);
        // Check if the current property name/address matches the real address from BIN
        const propNameLower = prop.name.toLowerCase();
        const propAddrLower = prop.address.toLowerCase();
        const realAddrLower = fullRealAddress.toLowerCase();
        const isMatch = propNameLower.includes(realAddrLower) || propAddrLower.includes(realAddrLower);
        if (!isMatch) {
            console.log(`  ⚠️ MISMATCH DETECTED! Property "${prop.name}" does NOT match real BIN address "${fullRealAddress}".`);
            console.log(`  Re-linking violations and restoring "${prop.name}"...`);
            // 1. Reset nycBin on the mismatched property ("63 Verona Ave")
            await prisma.property.update({
                where: { id: prop.id },
                data: { nycBin: null },
            });
            console.log(`  ✅ Cleared nycBin from "${prop.name}".`);
            // 2. Find or create the correct property for this BIN
            const realPropName = fullRealAddress;
            const realFullAddress = `${fullRealAddress}, New York, NY`;
            let targetProp = await prisma.property.findFirst({
                where: {
                    companyId: prop.companyId,
                    OR: [
                        { nycBin: cleanBin },
                        { address: { equals: realFullAddress } },
                        { streetAddress: { equals: fullRealAddress } },
                    ],
                },
            });
            if (!targetProp) {
                targetProp = await prisma.property.create({
                    data: {
                        name: realPropName,
                        type: prop.type,
                        ownerId: prop.ownerId,
                        nycBin: cleanBin,
                        address: realFullAddress,
                        streetAddress: fullRealAddress,
                        city: 'New York',
                        state: 'NY',
                        country: 'USA',
                        zip: '10001',
                        yearBuilt: prop.yearBuilt || 1990,
                        squareFootage: prop.squareFootage || 25000,
                        purchasePrice: prop.purchasePrice || 5000000,
                        currentValue: prop.currentValue || 7500000,
                        companyId: prop.companyId,
                    },
                });
                console.log(`  ✨ Created brand new property: "${targetProp.name}" (ID: ${targetProp.id}) for BIN ${cleanBin}.`);
            }
            else {
                if (!targetProp.nycBin) {
                    await prisma.property.update({
                        where: { id: targetProp.id },
                        data: { nycBin: cleanBin },
                    });
                }
                console.log(`  Found existing target property: "${targetProp.name}" (ID: ${targetProp.id}).`);
            }
            // 3. Ensure target property has building & unit
            let targetUnit = await prisma.unit.findFirst({
                where: { propertyId: targetProp.id },
            });
            if (!targetUnit) {
                let building = await prisma.building.findFirst({
                    where: { propertyId: targetProp.id },
                });
                if (!building) {
                    building = await prisma.building.create({
                        data: {
                            propertyId: targetProp.id,
                            name: 'Main Building',
                            floors: 6,
                        },
                    });
                }
                targetUnit = await prisma.unit.create({
                    data: {
                        propertyId: targetProp.id,
                        buildingId: building.id,
                        unitNumber: 'Building Wide',
                        floor: 1,
                        bedrooms: 0,
                        bathrooms: 1,
                        squareFootage: 2500,
                        rentAmount: 0,
                        securityDeposit: 0,
                        availabilityDate: new Date(),
                        status: 'Occupied',
                    },
                });
            }
            // 4. Move all violations from mismatched property unit to target property unit (ZERO DATA LOSS)
            let movedCount = 0;
            for (const unit of prop.units) {
                for (const violation of unit.violations) {
                    await prisma.violation.update({
                        where: { id: violation.id },
                        data: { unitId: targetUnit.id },
                    });
                    movedCount++;
                }
            }
            console.log(`  📦 Successfully moved ${movedCount} violation(s) from "${prop.name}" -> "${targetProp.name}".`);
        }
        else {
            console.log(`  ✅ Property "${prop.name}" matches BIN address. No changes needed.`);
        }
    }
    console.log('\n🎉 Safe Cleanup & Re-linking Completed Successfully!');
}
main()
    .catch((e) => {
    console.error('Error during cleanup:', e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
