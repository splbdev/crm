const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculateNextRun(frequency, fromDate = new Date()) {
    switch (frequency) {
        case 'WEEKLY':
            return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'MONTHLY':
            return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, fromDate.getDate());
        case 'ANNUAL':
            return new Date(fromDate.getFullYear() + 1, fromDate.getMonth(), fromDate.getDate());
        default:
            return new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, fromDate.getDate());
    }
}

async function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
        where: { number: { startsWith: `INV-${year}` } }
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function processRecurringInvoices() {
    console.log('[CRON] Processing recurring invoices...');

    try {
        const now = new Date();

        // Find all recurring invoices that are due
        const dueInvoices = await prisma.invoice.findMany({
            where: {
                isRecurring: true,
                nextRun: { lte: now }
            },
            include: { client: true }
        });

        console.log(`[CRON] Found ${dueInvoices.length} recurring invoices to process`);

        for (const invoice of dueInvoices) {
            try {
                const newNumber = await generateInvoiceNumber();

                // Create new invoice
                await prisma.invoice.create({
                    data: {
                        clientId: invoice.clientId,
                        number: newNumber,
                        date: new Date(),
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        status: 'SENT',
                        items: invoice.items,
                        total: invoice.total,
                        currency: invoice.currency,
                        isRecurring: false // The new invoice is not recurring itself
                    }
                });

                // Update the recurring invoice's next run
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        nextRun: calculateNextRun(invoice.frequency)
                    }
                });

                console.log(`[CRON] Created recurring invoice ${newNumber} for client ${invoice.client?.name}`);
            } catch (err) {
                console.error(`[CRON] Failed to process invoice ${invoice.id}:`, err);
            }
        }
    } catch (error) {
        console.error('[CRON] Error processing recurring invoices:', error);
    }
}

function startCronJobs() {
    // Run every day at 1:00 AM
    cron.schedule('0 1 * * *', processRecurringInvoices);

    console.log('[CRON] Scheduled jobs started');

    // Also run once on startup after a delay
    setTimeout(processRecurringInvoices, 5000);
}

module.exports = { startCronJobs, processRecurringInvoices };
