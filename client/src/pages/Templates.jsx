import { useState, useEffect } from 'react';
import { templates } from '../api';
import { FiPlus, FiEdit2, FiTrash2, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TEMPLATE_TYPES = ['INVOICE', 'ESTIMATE', 'EMAIL', 'SMS', 'WHATSAPP', 'PROPOSAL'];

export default function Templates() {
    const [templateList, setTemplateList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, [activeType]);

    const loadData = async () => {
        try {
            const res = await templates.getAll(activeType || undefined);
            setTemplateList(res.data);
        } catch (error) {
            toast.error('Failed to load');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this template?')) return;
        try {
            await templates.delete(id);
            toast.success('Deleted');
            loadData();
        } catch (error) {
            toast.error('Failed');
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await templates.update(editing.id, data);
            } else {
                await templates.create(data);
            }
            toast.success('Saved');
            setShowModal(false);
            setEditing(null);
            loadData();
        } catch (error) {
            toast.error('Failed');
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Templates</h1>
                    <p className="page-subtitle">Manage message and document templates</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
                    <FiPlus /> New Template
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className={`btn btn-sm ${!activeType ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveType('')}>All</button>
                        {TEMPLATE_TYPES.map(t => (
                            <button key={t} className={`btn btn-sm ${activeType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveType(t)}>{t}</button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : templateList.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Default</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templateList.map(t => (
                                    <tr key={t.id}>
                                        <td><strong>{t.name}</strong></td>
                                        <td><span className="badge badge-info">{t.type}</span></td>
                                        <td>{t.isDefault && <FiStar color="var(--warning)" />}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(t); setShowModal(true); }}><FiEdit2 /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state"><p>No templates found</p></div>
                )}
            </div>

            {showModal && <TemplateModal template={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={handleSubmit} />}
        </div>
    );
}

function TemplateModal({ template, onClose, onSubmit }) {
    const [name, setName] = useState(template?.name || '');
    const [type, setType] = useState(template?.type || 'EMAIL');
    const [content, setContent] = useState(template?.content || '');
    const [isDefault, setIsDefault] = useState(template?.isDefault || false);

    const handleSubmit = (e) => { e.preventDefault(); onSubmit({ name, type, content, isDefault }); };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{template ? 'Edit' : 'New'} Template</h3>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type *</label>
                            <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                                {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Content</label>
                            <textarea className="form-input" value={content} onChange={e => setContent(e.target.value)} rows={10} placeholder="Use {{client_name}}, {{invoice_number}} etc. for variables" />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                                Set as default for this type
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{template ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
