"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAutoInvoices = generateAutoInvoices;
const database_1 = __importDefault(require("../config/database"));
async function generateAutoInvoices() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Fetch active leases that have already started
        const activeLeases = await database_1.default.lease.findMany({
            where: {
                status: 'Active',
                startDate: { lte: today },
            },
            include: {
                tenant: true,
                property: true,
                unit: true,
            },
        });
        for (const lease of activeLeases) {
            const start = new Date(lease.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(lease.endDate);
            end.setHours(23, 59, 59, 999);
            // Verify today is not past lease end date
            const limitDate = today < end ? today : end;
            let elapsedMonths = 0;
            let currentBillingDate = new Date(start);
            while (currentBillingDate <= limitDate) {
                const billingDateStr = currentBillingDate.toISOString().split('T')[0];
                // Check if we already have a Rent Charge invoice for this tenant on this specific billing date
                const existingInvoice = await database_1.default.invoice.findFirst({
                    where: {
                        tenantId: lease.tenantId,
                        dueDate: billingDateStr,
                        lineItems: {
                            contains: 'Rent Charge',
                        },
                    },
                });
                if (!existingInvoice) {
                    const tenantName = `${lease.tenant.firstName} ${lease.tenant.lastName}`;
                    const lineItems = [
                        { description: 'Rent Charge', amount: lease.rentAmount },
                    ];
                    await database_1.default.invoice.create({
                        data: {
                            tenantId: lease.tenantId,
                            tenantName,
                            propertyId: lease.propertyId,
                            propertyName: lease.property.name,
                            unitNumber: lease.unit.unitNumber,
                            dueDate: billingDateStr,
                            amount: lease.rentAmount,
                            balance: lease.rentAmount,
                            paidAmount: 0,
                            status: 'Sent',
                            lineItems: JSON.stringify(lineItems),
                            notes: `Auto-generated rent invoice for billing cycle starting ${billingDateStr}`,
                            companyId: lease.companyId,
                        },
                    });
                    console.log(`[Auto-Billing] Created invoice for ${tenantName} for cycle date ${billingDateStr} (amount: $${lease.rentAmount})`);
                }
                // Advance to the next billing cycle month
                elapsedMonths++;
                const nextDate = new Date(start);
                // Add months elapsed
                nextDate.setMonth(start.getMonth() + elapsedMonths);
                // Handle month end overflow (e.g. original day was 31st but target month only has 30 days)
                const expectedMonth = (start.getMonth() + elapsedMonths) % 12;
                if (nextDate.getMonth() !== expectedMonth) {
                    nextDate.setDate(0); // Restores to the last day of the expected month
                }
                currentBillingDate = nextDate;
            }
        }
    }
    catch (error) {
        console.error('[Auto-Billing] Error generating auto rent invoices:', error);
    }
}
