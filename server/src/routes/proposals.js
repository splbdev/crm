const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all proposals
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;

        const where = status ? { status } : {};

        const [proposals, total] = await Promise.all([
            prisma.proposal.findMany({
                where,
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.proposal.count({ where })
        ]);

        res.json({ proposals, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Get proposals error:', error);
        res.status(500).json({ error: 'Failed to get proposals' });
    }
});

// Get single proposal
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const proposal = await prisma.proposal.findUnique({
            where: { id: req.params.id }
        });

        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }

        res.json(proposal);
    } catch (error) {
        console.error('Get proposal error:', error);
        res.status(500).json({ error: 'Failed to get proposal' });
    }
});

// Create proposal
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, content, status } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const proposal = await prisma.proposal.create({
            data: { title, content, status: status || 'DRAFT' }
        });

        res.status(201).json(proposal);
    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

// Update proposal
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, content, status } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (status) updateData.status = status;

        const proposal = await prisma.proposal.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json(proposal);
    } catch (error) {
        console.error('Update proposal error:', error);
        res.status(500).json({ error: 'Failed to update proposal' });
    }
});

// Delete proposal
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.proposal.delete({ where: { id: req.params.id } });
        res.json({ message: 'Proposal deleted successfully' });
    } catch (error) {
        console.error('Delete proposal error:', error);
        res.status(500).json({ error: 'Failed to delete proposal' });
    }
});

module.exports = router;
