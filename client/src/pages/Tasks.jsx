import { useState, useEffect } from 'react';
import { tasks, clients } from '../api';
import {
    FiPlus, FiEdit2, FiTrash2, FiCheck, FiClock,
    FiAlertCircle, FiUser, FiCalendar, FiFilter, FiX
} from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Tasks() {
    const [taskList, setTaskList] = useState([]);
    const [clientList, setClientList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [stats, setStats] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        clientId: ''
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        try {
            const [tasksRes, clientsRes, statsRes] = await Promise.all([
                tasks.getAll(filters),
                clients.getAll({ limit: 100 }),
                tasks.getStats()
            ]);
            setTaskList(tasksRes.data);
            setClientList(clientsRes.data.clients || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (taskData) => {
        try {
            if (editingTask) {
                await tasks.update(editingTask.id, taskData);
                toast.success('Task updated');
            } else {
                await tasks.create(taskData);
                toast.success('Task created');
            }
            setShowModal(false);
            setEditingTask(null);
            loadData();
        } catch (error) {
            toast.error('Failed to save task');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task?')) return;
        try {
            await tasks.delete(id);
            toast.success('Task deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await tasks.updateStatus(id, status);
            loadData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'URGENT': return 'danger';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'default';
            default: return 'default';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'info';
            case 'PENDING': return 'default';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tasks</h1>
                    <p className="page-subtitle">Manage your tasks and follow-ups</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FiPlus /> New Task
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon primary"><FiClock /></div>
                    <div className="stat-value">{stats?.pending || 0}</div>
                    <div className="stat-label">Pending</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info"><FiClock /></div>
                    <div className="stat-value">{stats?.inProgress || 0}</div>
                    <div className="stat-label">In Progress</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><FiCheck /></div>
                    <div className="stat-value">{stats?.completed || 0}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger"><FiAlertCircle /></div>
                    <div className="stat-value">{stats?.overdue || 0}</div>
                    <div className="stat-label">Overdue</div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 24, padding: 16 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FiFilter style={{ color: 'var(--text-secondary)' }} />
                    <select
                        className="form-input"
                        style={{ width: 150 }}
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                    <select
                        className="form-input"
                        style={{ width: 150 }}
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    >
                        <option value="">All Priority</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>
                    <select
                        className="form-input"
                        style={{ width: 200 }}
                        value={filters.clientId}
                        onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                    >
                        <option value="">All Clients</option>
                        {clientList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    {(filters.status || filters.priority || filters.clientId) && (
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setFilters({ status: '', priority: '', clientId: '' })}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Task List */}
            <div className="card">
                {taskList.length > 0 ? (
                    <div className="task-list">
                        {taskList.map(task => (
                            <div
                                key={task.id}
                                className={`task-item ${task.isOverdue ? 'overdue' : ''} ${task.status === 'COMPLETED' ? 'completed' : ''}`}
                            >
                                <div className="task-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={task.status === 'COMPLETED'}
                                        onChange={() => handleStatusChange(
                                            task.id,
                                            task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
                                        )}
                                    />
                                </div>
                                <div className="task-content">
                                    <div className="task-title">{task.title}</div>
                                    {task.description && (
                                        <div className="task-description">{task.description}</div>
                                    )}
                                    <div className="task-meta">
                                        <span className={`badge badge-${getPriorityClass(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        <span className={`badge badge-${getStatusClass(task.status)}`}>
                                            {task.status.replace('_', ' ')}
                                        </span>
                                        {task.client && (
                                            <span className="task-client">
                                                <FiUser /> {task.client.name}
                                            </span>
                                        )}
                                        {task.dueDate && (
                                            <span className={`task-due ${task.isOverdue ? 'overdue' : ''}`}>
                                                <FiCalendar /> {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="task-actions">
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => { setEditingTask(task); setShowModal(true); }}
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => handleDelete(task.id)}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiCheck className="empty-state-icon" />
                        <p>No tasks found</p>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            Create your first task
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <TaskModal
                    task={editingTask}
                    clients={clientList}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingTask(null); }}
                />
            )}
        </div>
    );
}

function TaskModal({ task, clients, onSave, onClose }) {
    const [form, setForm] = useState({
        title: task?.title || '',
        description: task?.description || '',
        clientId: task?.clientId || '',
        dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
        priority: task?.priority || 'MEDIUM',
        status: task?.status || 'PENDING'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}>
                        <FiX />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Client</label>
                                <select
                                    className="form-input"
                                    value={form.clientId}
                                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                                >
                                    <option value="">No client</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.dueDate}
                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <select
                                    className="form-input"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-input"
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                >
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {task ? 'Update' : 'Create'} Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
