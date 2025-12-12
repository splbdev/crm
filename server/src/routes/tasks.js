const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            status,
            priority,
            clientId,
            assigneeId,
            dueBefore,
            dueAfter,
            search
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (clientId) where.clientId = clientId;
        if (assigneeId) where.assigneeId = assigneeId;

        if (dueBefore || dueAfter) {
            where.dueDate = {};
            if (dueBefore) where.dueDate.lte = new Date(dueBefore);
            if (dueAfter) where.dueDate.gte = new Date(dueAfter);
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                client: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } }
            },
            orderBy: [
                { priority: 'desc' },
                { dueDate: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Add computed fields
        const tasksWithMeta = tasks.map(task => ({
            ...task,
            isOverdue: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
        }));

        res.json(tasksWithMeta);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Get task stats (MUST be before /:id route)
router.get('/stats/summary', authMiddleware, async (req, res) => {
    try {
        const [pending, inProgress, completed, overdue] = await Promise.all([
            prisma.task.count({ where: { status: 'PENDING' } }),
            prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { status: 'COMPLETED' } }),
            prisma.task.count({
                where: {
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: new Date() }
                }
            })
        ]);

        // Tasks due this week
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);

        const dueThisWeek = await prisma.task.count({
            where: {
                status: { not: 'COMPLETED' },
                dueDate: {
                    gte: new Date(),
                    lte: weekEnd
                }
            }
        });

        res.json({
            pending,
            inProgress,
            completed,
            overdue,
            dueThisWeek,
            total: pending + inProgress + completed
        });
    } catch (error) {
        console.error('Task stats error:', error);
        res.status(500).json({ error: 'Failed to fetch task stats' });
    }
});

// Get single task
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            include: {
                client: true,
                assignee: { select: { id: true, name: true, email: true } }
            }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
    }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, description, clientId, assigneeId, dueDate, priority, status } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description: description || null,
                clientId: clientId || null,
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority || 'MEDIUM',
                status: status || 'PENDING'
            },
            include: {
                client: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });

        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Update task
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, description, clientId, assigneeId, dueDate, priority, status } = req.body;

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                title,
                description,
                clientId: clientId || null,
                assigneeId: assigneeId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                priority,
                status
            },
            include: {
                client: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true, email: true } }
            }
        });

        res.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Quick status update
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const task = await prisma.task.update({
            where: { id: req.params.id },
            data: { status }
        });

        res.json(task);
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({ error: 'Failed to update task status' });
    }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.task.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

module.exports = router;
