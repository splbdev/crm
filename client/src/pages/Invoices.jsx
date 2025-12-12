import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoices, clients as clientsApi, payments } from '../api';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiRefreshCw, FiDownload, FiEye, FiDollarSign, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Invoices() {
    const [invoiceList, setInvoiceList] = useState([]);
    const [clientList, setClientList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [filter, setFilter] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [paymentInvoice, setPaymentInvoice] = useState(null);

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

    const handleDownloadPDF = async (inv) => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const response = await fetch(`${API_BASE}/invoices/${inv.id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('PDF generation failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${inv.number}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('PDF downloaded');
        } catch (error) {
            toast.error('Failed to download PDF');
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
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => setPreviewInvoice(inv)} title="Preview">
                                                    <FiEye />
                                                </button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleDownloadPDF(inv)} title="Download PDF">
                                                    <FiDownload />
                                                </button>
                                                {inv.status !== 'PAID' && (
                                                    <>
                                                        <button className="btn btn-sm btn-info" onClick={() => setPaymentInvoice(inv)} title="Record Payment">
                                                            <FiDollarSign />
                                                        </button>
                                                        <button className="btn btn-sm btn-success" onClick={() => handleMarkPaid(inv.id)} title="Mark Paid">
                                                            <FiCheck />
                                                        </button>
                                                    </>
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

            {previewInvoice && (
                <InvoicePreview
                    invoice={previewInvoice}
                    onClose={() => setPreviewInvoice(null)}
                    onDownload={() => handleDownloadPDF(previewInvoice)}
                />
            )}

            {paymentInvoice && (
                <PaymentModal
                    invoice={paymentInvoice}
                    onClose={() => setPaymentInvoice(null)}
                    onSuccess={() => { setPaymentInvoice(null); loadData(); }}
                />
            )}
        </div>
    );
}

function InvoicePreview({ invoice, onClose, onDownload }) {
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    const items = invoice.items || [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Invoice {invoice.number}</h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}><FiX /></button>
                </div>
                <div className="modal-body">
                    <div className="invoice-preview">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--primary)' }}>INVOICE</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: '4px 0' }}>#{invoice.number}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span className={`badge badge-${invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'danger' : 'info'}`}>
                                    {invoice.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-2" style={{ marginBottom: 24 }}>
                            <div>
                                <strong>Bill To:</strong>
                                <p style={{ margin: '4px 0' }}>{invoice.client?.name || 'N/A'}</p>
                                {invoice.client?.email && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>{invoice.client.email}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: '4px 0' }}><strong>Date:</strong> {format(new Date(invoice.date), 'MMM d, yyyy')}</p>
                                <p style={{ margin: 0 }}><strong>Due:</strong> {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                            </div>
                        </div>

                        <table style={{ width: '100%', marginBottom: 16 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: 8 }}>Description</th>
                                    <th style={{ textAlign: 'right', padding: 8 }}>Qty</th>
                                    <th style={{ textAlign: 'right', padding: 8 }}>Price</th>
                                    <th style={{ textAlign: 'right', padding: 8 }}>Tax</th>
                                    <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const lineTotal = (item.quantity || 1) * (item.price || 0);
                                    const taxAmount = lineTotal * ((item.tax || 0) / 100);
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: 8 }}>{item.description}</td>
                                            <td style={{ textAlign: 'right', padding: 8 }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: 8 }}>{formatCurrency(item.price)}</td>
                                            <td style={{ textAlign: 'right', padding: 8 }}>{item.tax}%</td>
                                            <td style={{ textAlign: 'right', padding: 8 }}>{formatCurrency(lineTotal + taxAmount)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <div style={{ textAlign: 'right', fontSize: 20, fontWeight: 700 }}>
                            Total: {formatCurrency(invoice.total)}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={onDownload}>
                        <FiDownload /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function PaymentModal({ invoice, onClose, onSuccess }) {
    const [amount, setAmount] = useState(invoice.total);
    const [method, setMethod] = useState('CASH');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await payments.recordManual({ invoiceId: invoice.id, amount, method, notes });
            toast.success('Payment recorded');
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Record Payment</h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}><FiX /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p style={{ marginBottom: 16 }}>
                            Invoice: <strong>{invoice.number}</strong> — Total: <strong>${invoice.total.toFixed(2)}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <input
                                type="number"
                                className="form-input"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                                step="0.01"
                                max={invoice.total}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payment Method</label>
                            <select className="form-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                                <option value="CASH">Cash</option>
                                <option value="CHECK">Check</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CREDIT_CARD">Credit Card</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <textarea
                                className="form-input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
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
