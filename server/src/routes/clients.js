const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all clients
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;

        const where = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ]
        } : {};

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { invoices: true, estimates: true, messages: true }
                    }
                }
            }),
            prisma.client.count({ where })
        ]);

        res.json({ clients, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ error: 'Failed to get clients' });
    }
});

// Get single client
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: req.params.id },
            include: {
                invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
                estimates: { orderBy: { createdAt: 'desc' }, take: 5 },
                messages: { orderBy: { createdAt: 'desc' }, take: 10 }
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Failed to get client' });
    }
});

// Create client
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, address, notes, company } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const client = await prisma.client.create({
            data: { name, email, phone, address, notes, company }
        });

        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

// Update client
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, address, notes, company } = req.body;

        const client = await prisma.client.update({
            where: { id: req.params.id },
            data: { name, email, phone, address, notes, company }
        });

        res.json(client);
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

// Delete client
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.client.delete({ where: { id: req.params.id } });
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

module.exports = router;
