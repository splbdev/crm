require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

// Routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const providerRoutes = require('./routes/providers');
const invoiceRoutes = require('./routes/invoices');
const estimateRoutes = require('./routes/estimates');
const templateRoutes = require('./routes/templates');
const proposalRoutes = require('./routes/proposals');
const messageRoutes = require('./routes/messages');

// Cron jobs
const { startCronJobs } = require('./cron/recurring');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/messages', messageRoutes);

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
    try {
        const [
            clientCount,
            invoiceStats,
            estimateCount,
            messageCount,
            recentInvoices,
            recentClients
        ] = await Promise.all([
            prisma.client.count(),
            prisma.invoice.groupBy({
                by: ['status'],
                _count: true,
                _sum: { total: true }
            }),
            prisma.estimate.count(),
            prisma.message.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
            prisma.invoice.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: { client: { select: { name: true } } }
            }),
            prisma.client.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const totalRevenue = invoiceStats
            .filter(s => s.status === 'PAID')
            .reduce((sum, s) => sum + (s._sum.total || 0), 0);

        const pendingRevenue = invoiceStats
            .filter(s => ['SENT', 'OVERDUE'].includes(s.status))
            .reduce((sum, s) => sum + (s._sum.total || 0), 0);

        res.json({
            clients: clientCount,
            estimates: estimateCount,
            messagesThisMonth: messageCount,
            totalRevenue,
            pendingRevenue,
            invoicesByStatus: invoiceStats,
            recentInvoices,
            recentClients
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CRM Server running on http://localhost:${PORT}`);
    startCronJobs();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;
