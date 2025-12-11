const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { encryptCredentials, decryptCredentials } = require('../utils/encryption');

const router = express.Router();
const prisma = new PrismaClient();

// Get all provider configs (credentials are masked)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type } = req.query;

        const where = type ? { type } : {};

        const configs = await prisma.providerConfig.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Mask credentials in response
        const maskedConfigs = configs.map(config => ({
            ...config,
            credentials: '***ENCRYPTED***',
            hasCredentials: !!config.credentials
        }));

        res.json(maskedConfigs);
    } catch (error) {
        console.error('Get providers error:', error);
        res.status(500).json({ error: 'Failed to get providers' });
    }
});

// Get single provider config with decrypted credentials
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const config = await prisma.providerConfig.findUnique({
            where: { id: req.params.id }
        });

        if (!config) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        // Decrypt credentials for admin view
        let credentials = {};
        if (config.credentials) {
            try {
                credentials = decryptCredentials(config.credentials);
            } catch (e) {
                console.error('Failed to decrypt credentials:', e);
                credentials = { error: 'Failed to decrypt' };
            }
        }

        res.json({
            ...config,
            credentials
        });
    } catch (error) {
        console.error('Get provider error:', error);
        res.status(500).json({ error: 'Failed to get provider' });
    }
});

// Create provider config
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { type, provider, name, isActive, credentials } = req.body;

        if (!type || !provider) {
            return res.status(400).json({ error: 'Type and provider are required' });
        }

        // Encrypt credentials before storing
        const encryptedCredentials = credentials ? encryptCredentials(credentials) : null;

        const config = await prisma.providerConfig.create({
            data: {
                type,
                provider,
                name,
                isActive: isActive || false,
                credentials: encryptedCredentials
            }
        });

        res.status(201).json({
            ...config,
            credentials: '***ENCRYPTED***'
        });
    } catch (error) {
        console.error('Create provider error:', error);
        res.status(500).json({ error: 'Failed to create provider' });
    }
});

// Update provider config
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { type, provider, name, isActive, credentials } = req.body;

        const updateData = {};
        if (type) updateData.type = type;
        if (provider) updateData.provider = provider;
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (credentials) {
            updateData.credentials = encryptCredentials(credentials);
        }

        const config = await prisma.providerConfig.update({
            where: { id: req.params.id },
            data: updateData
        });

        res.json({
            ...config,
            credentials: '***ENCRYPTED***'
        });
    } catch (error) {
        console.error('Update provider error:', error);
        res.status(500).json({ error: 'Failed to update provider' });
    }
});

// Delete provider config
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await prisma.providerConfig.delete({ where: { id: req.params.id } });
        res.json({ message: 'Provider deleted successfully' });
    } catch (error) {
        console.error('Delete provider error:', error);
        res.status(500).json({ error: 'Failed to delete provider' });
    }
});

// Set provider as active (and deactivate others of same type)
router.post('/:id/activate', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const config = await prisma.providerConfig.findUnique({
            where: { id: req.params.id }
        });

        if (!config) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        // Deactivate all providers of same type
        await prisma.providerConfig.updateMany({
            where: { type: config.type },
            data: { isActive: false }
        });

        // Activate this one
        const updated = await prisma.providerConfig.update({
            where: { id: req.params.id },
            data: { isActive: true }
        });

        res.json({
            ...updated,
            credentials: '***ENCRYPTED***'
        });
    } catch (error) {
        console.error('Activate provider error:', error);
        res.status(500).json({ error: 'Failed to activate provider' });
    }
});

module.exports = router;
