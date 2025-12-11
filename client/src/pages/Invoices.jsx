import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoices, clients as clientsApi } from '../api';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Invoices() {
    const [invoiceList, setInvoiceList] = useState([]);
    const [clientList, setClientList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        try {
            const [invRes, clientRes] = await Promise.all([
                invoices.getAll({ status: filter || undefined }),
                clientsApi.getAll({ limit: 100 })
            ]);
            setInvoiceList(invRes.data.invoices);
            setClientList(clientRes.data.clients);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this invoice?')) return;
        try {
            await invoices.delete(id);
            toast.success('Invoice deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleMarkPaid = async (id) => {
        try {
            await invoices.markPaid(id);
            toast.success('Marked as paid');
            loadData();
        } catch (error) {
            toast.error('Failed to update');
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (editingInvoice) {
                await invoices.update(editingInvoice.id, data);
                toast.success('Invoice updated');
            } else {
                await invoices.create(data);
                toast.success('Invoice created');
            }
            setShowModal(false);
            setEditingInvoice(null);
            loadData();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

    const statusColors = {
        DRAFT: 'default', SENT: 'info', PAID: 'success', OVERDUE: 'danger', CANCELLED: 'default'
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoices</h1>
                    <p className="page-subtitle">Manage your invoices and billing</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingInvoice(null); setShowModal(true); }}>
                    <FiPlus /> New Invoice
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(s => (
                            <button
                                key={s}
                                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilter(s)}
                            >
                                {s || 'All'}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : invoiceList.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Client</th>
                                    <th>Date</th>
                                    <th>Due Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceList.map(inv => (
                                    <tr key={inv.id}>
                                        <td>
                                            <Link to={`/invoices/${inv.id}`}>
                                                <strong>{inv.number}</strong>
                                                {inv.isRecurring && <FiRefreshCw size={12} style={{ marginLeft: 6 }} title="Recurring" />}
                                            </Link>
                                        </td>
                                        <td>{inv.client?.name}</td>
                                        <td>{format(new Date(inv.date), 'MMM d, yyyy')}</td>
                                        <td>{format(new Date(inv.dueDate), 'MMM d, yyyy')}</td>
                                        <td><strong>{formatCurrency(inv.total)}</strong></td>
                                        <td><span className={`badge badge-${statusColors[inv.status]}`}>{inv.status}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {inv.status !== 'PAID' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(inv.id)} title="Mark Paid">
                                                        <FiCheck />
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditingInvoice(inv); setShowModal(true); }}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inv.id)}>
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FiPlus className="empty-state-icon" />
                        <p>No invoices found</p>
                    </div>
                )}
            </div>

            {showModal && (
                <InvoiceModal
                    invoice={editingInvoice}
                    clients={clientList}
                    onClose={() => { setShowModal(false); setEditingInvoice(null); }}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}

function InvoiceModal({ invoice, clients, onClose, onSubmit }) {
    const [form, setForm] = useState({
        clientId: invoice?.clientId || '',
        date: invoice?.date ? format(new Date(invoice.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        dueDate: invoice?.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        items: invoice?.items || [{ description: '', quantity: 1, price: 0, tax: 0 }],
        isRecurring: invoice?.isRecurring || false,
        frequency: invoice?.frequency || 'MONTHLY'
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    };

    const handleItemChange = (idx, field, value) => {
        const items = [...form.items];
        items[idx][field] = field === 'description' ? value : parseFloat(value) || 0;
        setForm({ ...form, items });
    };

    const addItem = () => {
        setForm({ ...form, items: [...form.items, { description: '', quantity: 1, price: 0, tax: 0 }] });
    };

    const removeItem = (idx) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
    };

    const total = form.items.reduce((sum, item) => {
        const lineTotal = (item.quantity || 1) * (item.price || 0);
        return sum + lineTotal + (lineTotal * (item.tax || 0) / 100);
    }, 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{invoice ? 'Edit Invoice' : 'New Invoice'}</h3>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Client *</label>
                            <select name="clientId" className="form-input" value={form.clientId} onChange={handleChange} required>
                                <option value="">Select client...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-2">
                            <div className="form-group">
                                <label className="form-label">Invoice Date</label>
                                <input type="date" name="date" className="form-input" value={form.date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date</label>
                                <input type="date" name="dueDate" className="form-input" value={form.dueDate} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Line Items</label>
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                        style={{ flex: 2 }}
                                    />
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                        style={{ width: 70 }}
                                    />
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Price"
                                        value={item.price}
                                        onChange={e => handleItemChange(idx, 'price', e.target.value)}
                                        style={{ width: 100 }}
                                    />
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Tax %"
                                        value={item.tax}
                                        onChange={e => handleItemChange(idx, 'tax', e.target.value)}
                                        style={{ width: 70 }}
                                    />
                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>×</button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Item</button>
                        </div>

                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 16 }}>
                            Total: ${total.toFixed(2)}
                        </div>

                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" name="isRecurring" checked={form.isRecurring} onChange={handleChange} />
                                Recurring Invoice
                            </label>
                        </div>
                        {form.isRecurring && (
                            <div className="form-group">
                                <label className="form-label">Frequency</label>
                                <select name="frequency" className="form-input" value={form.frequency} onChange={handleChange}>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="ANNUAL">Annual</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{invoice ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
