import { useState, useEffect } from 'react';
import { proposals } from '../api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Proposals() {
    const [proposalList, setProposalList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await proposals.getAll();
            setProposalList(res.data.proposals);
        } catch (error) {
            toast.error('Failed to load');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this proposal?')) return;
        try {
            await proposals.delete(id);
            toast.success('Deleted');
            loadData();
        } catch (error) {
            toast.error('Failed');
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await proposals.update(editing.id, data);
            } else {
                await proposals.create(data);
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
                    <h1 className="page-title">Proposals</h1>
                    <p className="page-subtitle">Create project proposals</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
                    <FiPlus /> New Proposal
                </button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : proposalList.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposalList.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.title}</strong></td>
                                        <td><span className={`badge badge-${p.status === 'SENT' ? 'info' : 'default'}`}>{p.status}</span></td>
                                        <td>{format(new Date(p.createdAt), 'MMM d, yyyy')}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(p); setShowModal(true); }}><FiEdit2 /></button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state"><p>No proposals yet</p></div>
                )}
            </div>

            {showModal && <ProposalModal proposal={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSubmit={handleSubmit} />}
        </div>
    );
}

function ProposalModal({ proposal, onClose, onSubmit }) {
    const [title, setTitle] = useState(proposal?.title || '');
    const [content, setContent] = useState(proposal?.content || '');
    const [status, setStatus] = useState(proposal?.status || 'DRAFT');

    const handleSubmit = (e) => { e.preventDefault(); onSubmit({ title, content, status }); };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{proposal ? 'Edit' : 'New'} Proposal</h3>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Content</label>
                            <textarea className="form-input" value={content} onChange={e => setContent(e.target.value)} rows={10} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="DRAFT">Draft</option>
                                <option value="SENT">Sent</option>
                                <option value="ACCEPTED">Accepted</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{proposal ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
