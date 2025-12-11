const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Generate estimate number
async function generateEstimateNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.estimate.count({
        where: { number: { startsWith: `EST-${year}` } }
    });
    return `EST-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Get all estimates
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, clientId, page = 1, limit = 20 } = req.query;

        const where = {};
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;

        const [estimates, total] = await Promise.all([
            prisma.estimate.findMany({
                where,
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: { client: { select: { id: true, name: true, email: true } } }
            }),
            prisma.estimate.count({ where })
        ]);

        res.json({ estimates, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Get estimates error:', error);
        res.status(500).json({ error: 'Failed to get estimates' });
    }
});

// Get single estimate
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const estimate = await prisma.estimate.findUnique({
            where: { id: req.params.id },
            include: { client: true }
        });

        if (!estimate) {
            return res.status(404).json({ error: 'Estimate not found' });
        }

        res.json(estimate);
    } catch (error) {
        console.error('Get estimate error:', error);
        res.status(500).json({ error: 'Failed to get estimate' });
    }
});

// Create estimate
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { clientId, date, expiryDate, items, currency } = req.body;

        if (!clientId || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Client and items are required' });
        }

        const total = items.reduce((sum, item) => {
            const itemTotal = (item.quantity || 1) * (item.price || 0);
            const tax = itemTotal * ((item.tax || 0) / 100);
            return sum + itemTotal + tax;
        }, 0);

        const number = await generateEstimateNumber();

        const estimate = await prisma.estimate.create({
            data: {
                clientId,
                number,
                date: new Date(date || Date.now()),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                items,
                total,
                currency: currency || 'USD'
            },
            include: { client: true }
        });

        res.status(201).json(estimate);
    } catch (error) {
        console.error('Create estimate error:', error);
        res.status(500).json({ error: 'Failed to create estimate' });
    }
});

// Update estimate
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { date, expiryDate, status, items, currency } = req.body;

        const updateData = {};
        if (date) updateData.date = new Date(date);
        if (expiryDate) updateData.expiryDate = new Date(expiryDate);
        if (status) updateData.status = status;
        if (currency) updateData.currency = currency;

        if (items && Array.isArray(items)) {
            updateData.items = items;
            updateData.total = items.reduce((sum, item) => {
                const itemTotal = (item.quantity || 1) * (item.price || 0);
                const tax = itemTotal * ((item.tax || 0) / 100);
                return sum + itemTotal + tax;
            }, 0);
        }

        const estimate = await prisma.estimate.update({
            where: { id: req.params.id },
            data: updateData,
            include: { client: true }
        });

        res.json(estimate);
    } catch (error) {
        console.error('Update estimate error:', error);
        res.status(500).json({ error: 'Failed to update estimate' });
    }
});

// Delete estimate
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.estimate.delete({ where: { id: req.params.id } });
        res.json({ message: 'Estimate deleted successfully' });
    } catch (error) {
        console.error('Delete estimate error:', error);
        res.status(500).json({ error: 'Failed to delete estimate' });
    }
});

// Convert estimate to invoice
router.post('/:id/convert', authMiddleware, async (req, res) => {
    try {
        const estimate = await prisma.estimate.findUnique({
            where: { id: req.params.id }
        });

        if (!estimate) {
            return res.status(404).json({ error: 'Estimate not found' });
        }

        const year = new Date().getFullYear();
        const count = await prisma.invoice.count({
            where: { number: { startsWith: `INV-${year}` } }
        });
        const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

        const invoice = await prisma.invoice.create({
            data: {
                clientId: estimate.clientId,
                number: invoiceNumber,
                date: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: estimate.items,
                total: estimate.total,
                currency: estimate.currency
            },
            include: { client: true }
        });

        // Mark estimate as accepted
        await prisma.estimate.update({
            where: { id: req.params.id },
            data: { status: 'ACCEPTED' }
        });

        res.status(201).json(invoice);
    } catch (error) {
        console.error('Convert estimate error:', error);
        res.status(500).json({ error: 'Failed to convert estimate' });
    }
});

module.exports = router;
