import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { estimates, clients as clientsApi } from '../api';
import { FiPlus, FiEdit2, FiTrash2, FiArrowRight } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Estimates() {
    const [estimateList, setEstimateList] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [estRes, clientRes] = await Promise.all([
                estimates.getAll(),
                clientsApi.getAll({ limit: 100 })
            ]);
            setEstimateList(estRes.data.estimates);
            setClients(clientRes.data.clients);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this estimate?')) return;
        try {
            await estimates.delete(id);
            toast.success('Deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleConvert = async (id) => {
        if (!confirm('Convert this estimate to an invoice?')) return;
        try {
            await estimates.convert(id);
            toast.success('Converted to invoice');
            loadData();
        } catch (error) {
            toast.error('Failed to convert');
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await estimates.update(editing.id, data);
            } else {
                await estimates.create(data);
            }
            toast.success('Saved');
            setShowModal(false);
            setEditing(null);
            loadData();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Estimates</h1>
                    <p className="page-subtitle">Create and manage project estimates</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
                    <FiPlus /> New Estimate
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : estimateList.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Number</th>
                                    <th>Client</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimateList.map(est => (
                                    <tr key={est.id}>
                                        <td><strong>{est.number}</strong></td>
                                        <td>{est.client?.name}</td>
                                        <td>{format(new Date(est.date), 'MMM d, yyyy')}</td>
                                        <td>{formatCurrency(est.total)}</td>
                                        <td>
                                            <span className={`badge badge-${est.status === 'ACCEPTED' ? 'success' : est.status === 'REJECTED' ? 'danger' : 'default'}`}>
                                                {est.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {est.status !== 'ACCEPTED' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => handleConvert(est.id)} title="Convert to Invoice">
                                                        <FiArrowRight />
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(est); setShowModal(true); }}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(est.id)}>
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
                        <p>No estimates yet</p>
                    </div>
                )}
            </div>

            {showModal && (
                <EstimateModal
                    estimate={editing}
                    clients={clients}
                    onClose={() => { setShowModal(false); setEditing(null); }}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}

function EstimateModal({ estimate, clients, onClose, onSubmit }) {
    const [form, setForm] = useState({
        clientId: estimate?.clientId || '',
        date: estimate?.date ? format(new Date(estimate.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        expiryDate: estimate?.expiryDate ? format(new Date(estimate.expiryDate), 'yyyy-MM-dd') : '',
        items: estimate?.items || [{ description: '', quantity: 1, price: 0, tax: 0 }]
    });

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleItemChange = (idx, field, value) => {
        const items = [...form.items];
        items[idx][field] = field === 'description' ? value : parseFloat(value) || 0;
        setForm({ ...form, items });
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, price: 0, tax: 0 }] });
    const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

    const total = form.items.reduce((sum, item) => {
        const lineTotal = (item.quantity || 1) * (item.price || 0);
        return sum + lineTotal + (lineTotal * (item.tax || 0) / 100);
    }, 0);

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{estimate ? 'Edit Estimate' : 'New Estimate'}</h3>
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
                                <label className="form-label">Date</label>
                                <input type="date" name="date" className="form-input" value={form.date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Expiry Date</label>
                                <input type="date" name="expiryDate" className="form-input" value={form.expiryDate} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Line Items</label>
                            {form.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input type="text" className="form-input" placeholder="Description" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} style={{ flex: 2 }} />
                                    <input type="number" className="form-input" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} style={{ width: 70 }} />
                                    <input type="number" className="form-input" placeholder="Price" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} style={{ width: 100 }} />
                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>×</button>
                                </div>
                            ))}
                            <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}>+ Add Item</button>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 16 }}>Total: ${total.toFixed(2)}</div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{estimate ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
