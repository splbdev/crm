const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { decryptCredentials } = require('../utils/encryption');
const { createSMSProvider } = require('../services/sms');
const { createEmailProvider } = require('../services/email');
const { createWhatsAppProvider } = require('../services/whatsapp');

const router = express.Router();
const prisma = new PrismaClient();

// Get active provider for a type
async function getActiveProvider(type) {
    const config = await prisma.providerConfig.findFirst({
        where: { type, isActive: true }
    });

    if (!config) {
        throw new Error(`No active ${type} provider configured`);
    }

    const credentials = decryptCredentials(config.credentials);
    return { config, credentials };
}

// Get message history
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { type, clientId, direction, page = 1, limit = 50 } = req.query;

        const where = {};
        if (type) where.type = type;
        if (clientId) where.clientId = clientId;
        if (direction) where.direction = direction;

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where,
                skip: (page - 1) * limit,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: { client: { select: { id: true, name: true } } }
            }),
            prisma.message.count({ where })
        ]);

        res.json({ messages, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});

// Send SMS
router.post('/sms', authMiddleware, async (req, res) => {
    try {
        const { to, message, clientId } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Recipient and message are required' });
        }

        const { config, credentials } = await getActiveProvider('SMS');
        const provider = createSMSProvider(config.provider, credentials);

        const result = await provider.send(to, message);

        // Log the message
        const messageLog = await prisma.message.create({
            data: {
                clientId: clientId || null,
                type: 'SMS',
                direction: 'OUTBOUND',
                status: result.success ? 'SENT' : 'FAILED',
                from: credentials.fromNumber || 'SYSTEM',
                to,
                content: message,
                provider: config.provider,
                externalId: result.externalId
            }
        });

        res.json({
            success: result.success,
            message: result.success ? 'SMS sent successfully' : 'Failed to send SMS',
            error: result.error,
            messageId: messageLog.id
        });
    } catch (error) {
        console.error('Send SMS error:', error);
        res.status(500).json({ error: error.message || 'Failed to send SMS' });
    }
});

// Send Email
router.post('/email', authMiddleware, async (req, res) => {
    try {
        const { to, subject, html, text, clientId } = req.body;

        if (!to || !subject || (!html && !text)) {
            return res.status(400).json({ error: 'Recipient, subject, and content are required' });
        }

        const { config, credentials } = await getActiveProvider('EMAIL');
        const provider = createEmailProvider(config.provider, credentials);

        const result = await provider.send(to, subject, html || text, text);

        const messageLog = await prisma.message.create({
            data: {
                clientId: clientId || null,
                type: 'EMAIL',
                direction: 'OUTBOUND',
                status: result.success ? 'SENT' : 'FAILED',
                from: credentials.email || credentials.fromEmail || 'SYSTEM',
                to,
                content: JSON.stringify({ subject, body: html || text }),
                provider: config.provider,
                externalId: result.externalId
            }
        });

        res.json({
            success: result.success,
            message: result.success ? 'Email sent successfully' : 'Failed to send email',
            error: result.error,
            messageId: messageLog.id
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: error.message || 'Failed to send email' });
    }
});

// Send WhatsApp
router.post('/whatsapp', authMiddleware, async (req, res) => {
    try {
        const { to, message, mediaUrl, mediaType, clientId } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Recipient and message are required' });
        }

        const { config, credentials } = await getActiveProvider('WHATSAPP');
        const provider = createWhatsAppProvider(config.provider, credentials);

        let result;
        if (mediaUrl && mediaType) {
            // Different providers handle media differently
            if (provider.sendImage && mediaType === 'image') {
                result = await provider.sendImage(to, mediaUrl, message);
            } else if (provider.sendVideo && mediaType === 'video') {
                result = await provider.sendVideo(to, mediaUrl, message);
            } else if (provider.sendDocument && mediaType === 'document') {
                result = await provider.sendDocument(to, mediaUrl, message);
            } else {
                result = await provider.send(to, message, mediaUrl, mediaType);
            }
        } else {
            result = await provider.send(to, message);
        }

        const messageLog = await prisma.message.create({
            data: {
                clientId: clientId || null,
                type: 'WHATSAPP',
                direction: 'OUTBOUND',
                status: result.success ? 'SENT' : 'FAILED',
                from: 'SYSTEM',
                to,
                content: JSON.stringify({ message, mediaUrl, mediaType }),
                provider: config.provider,
                externalId: result.externalId
            }
        });

        res.json({
            success: result.success,
            message: result.success ? 'WhatsApp message sent successfully' : 'Failed to send message',
            error: result.error,
            messageId: messageLog.id
        });
    } catch (error) {
        console.error('Send WhatsApp error:', error);
        res.status(500).json({ error: error.message || 'Failed to send WhatsApp message' });
    }
});

// Send bulk messages
router.post('/bulk', authMiddleware, async (req, res) => {
    try {
        const { type, recipients, message, subject } = req.body;

        if (!type || !recipients || !Array.isArray(recipients) || !message) {
            return res.status(400).json({ error: 'Type, recipients array, and message are required' });
        }

        const results = [];

        for (const recipient of recipients) {
            try {
                let result;

                if (type === 'SMS') {
                    const { config, credentials } = await getActiveProvider('SMS');
                    const provider = createSMSProvider(config.provider, credentials);
                    result = await provider.send(recipient.phone || recipient, message);
                } else if (type === 'EMAIL') {
                    const { config, credentials } = await getActiveProvider('EMAIL');
                    const provider = createEmailProvider(config.provider, credentials);
                    result = await provider.send(recipient.email || recipient, subject, message);
                } else if (type === 'WHATSAPP') {
                    const { config, credentials } = await getActiveProvider('WHATSAPP');
                    const provider = createWhatsAppProvider(config.provider, credentials);
                    result = await provider.send(recipient.phone || recipient, message);
                }

                results.push({
                    recipient: recipient.phone || recipient.email || recipient,
                    success: result?.success || false
                });
            } catch (err) {
                results.push({
                    recipient: recipient.phone || recipient.email || recipient,
                    success: false,
                    error: err.message
                });
            }
        }

        res.json({
            total: recipients.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        });
    } catch (error) {
        console.error('Bulk send error:', error);
        res.status(500).json({ error: error.message || 'Failed to send bulk messages' });
    }
});

module.exports = router;
