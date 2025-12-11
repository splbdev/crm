const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all templates
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;

        const where = type ? { type } : {};

        const templates = await prisma.template.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json(templates);
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to get templates' });
    }
});

// Get single template
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await prisma.template.findUnique({
            where: { id: req.params.id }
        });

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ error: 'Failed to get template' });
    }
});

// Create template
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { type, name, content, isDefault } = req.body;

        if (!type || !name || !content) {
            return res.status(400).json({ error: 'Type, name, and content are required' });
        }

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await prisma.template.updateMany({
                where: { type, isDefault: true },
                data: { isDefault: false }
            });
        }

        const template = await prisma.template.create({
            data: { type, name, content, isDefault: isDefault || false }
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// Update template
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { type, name, content, isDefault } = req.body;

        const updateData = {};
        if (type) updateData.type = type;
        if (name) updateData.name = name;
        if (content) updateData.content = content;

        if (isDefault !== undefined) {
            if (isDefault) {
                const existing = await prisma.template.findUnique({ where: { id: req.params.id } });
                if (existing) {
                    await prisma.template.updateMany({
                        where: { type: existing.type, isDefault: true },
                        data: { isDefault: false }
                    });
                }
            }
            updateData.isDefault = isDefault;
        }

        const template = await prisma.template.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json(template);
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete template
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.template.delete({ where: { id: req.params.id } });
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Get default template for type
router.get('/default/:type', authMiddleware, async (req, res) => {
    try {
        const template = await prisma.template.findFirst({
            where: { type: req.params.type, isDefault: true }
        });

        if (!template) {
            return res.status(404).json({ error: 'No default template found' });
        }

        res.json(template);
    } catch (error) {
        console.error('Get default template error:', error);
        res.status(500).json({ error: 'Failed to get default template' });
    }
});

module.exports = router;
