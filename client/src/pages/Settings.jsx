import { useState, useEffect } from 'react';
import { providers } from '../api';
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PROVIDER_TYPES = ['SMS', 'EMAIL', 'WHATSAPP'];
const PROVIDERS_BY_TYPE = {
    SMS: [
        { value: 'TWILIO', label: 'Twilio', fields: ['accountSid', 'authToken', 'fromNumber'] },
        { value: 'ESMS', label: 'eSMS', fields: ['apiKey', 'secretKey', 'brandName'] }
    ],
    EMAIL: [
        { value: 'GMAIL', label: 'Gmail', fields: ['email', 'appPassword', 'fromName'] },
        { value: 'SMTP', label: 'Custom SMTP', fields: ['host', 'port', 'username', 'password', 'fromEmail', 'fromName', 'secure'] }
    ],
    WHATSAPP: [
        { value: 'TWILIO_WA', label: 'Twilio WhatsApp', fields: ['accountSid', 'authToken', 'fromNumber'] },
        { value: 'WAACS', label: 'WAACS', fields: ['apiKey', 'sessionName'] },
        { value: 'WHATSCLOUD', label: 'WhatsCloud', fields: ['token', 'instanceId'] },
        { value: 'OFFICIAL_WA', label: 'WhatsApp Business API', fields: ['accessToken', 'phoneNumberId'] }
    ]
};

export default function Settings() {
    const [providerList, setProviderList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('SMS');
    const [showModal, setShowModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [viewCredentials, setViewCredentials] = useState(null);

    useEffect(() => { loadProviders(); }, []);

    const loadProviders = async () => {
        try {
            const res = await providers.getAll();
            setProviderList(res.data);
        } catch (error) {
            toast.error('Failed to load providers');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this provider?')) return;
        try {
            await providers.delete(id);
            toast.success('Provider deleted');
            loadProviders();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const handleActivate = async (id) => {
        try {
            await providers.activate(id);
            toast.success('Provider activated');
            loadProviders();
        } catch (error) {
            toast.error('Failed to activate');
        }
    };

    const handleViewCredentials = async (id) => {
        try {
            const res = await providers.get(id);
            setViewCredentials(res.data);
        } catch (error) {
            toast.error('Failed to load credentials');
        }
    };

    const handleSubmit = async (data) => {
        try {
            if (editingProvider) {
                await providers.update(editingProvider.id, data);
                toast.success('Provider updated');
            } else {
                await providers.create(data);
                toast.success('Provider created');
            }
            setShowModal(false);
            setEditingProvider(null);
            loadProviders();
        } catch (error) {
            toast.error('Failed to save');
        }
    };

    const filteredProviders = providerList.filter(p => p.type === activeTab);

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Configure your communication providers</p>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {PROVIDER_TYPES.map(t => (
                            <button key={t} className={`btn ${activeTab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(t)}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditingProvider(null); setShowModal(true); }}>
                        <FiPlus /> Add Provider
                    </button>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : filteredProviders.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Provider</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProviders.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.name || p.provider}</strong></td>
                                        <td>{p.provider}</td>
                                        <td>
                                            <span className={`badge badge-${p.isActive ? 'success' : 'default'}`}>
                                                {p.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {!p.isActive && (
                                                    <button className="btn btn-sm btn-success" onClick={() => handleActivate(p.id)} title="Activate">
                                                        <FiCheck />
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleViewCredentials(p.id)} title="View Credentials">
                                                    <FiEye />
                                                </button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditingProvider(p); setShowModal(true); }}>
                                                    <FiEdit2 />
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>
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
                        <p>No {activeTab} providers configured</p>
                    </div>
                )}
            </div>

            {showModal && (
                <ProviderModal
                    provider={editingProvider}
                    type={activeTab}
                    onClose={() => { setShowModal(false); setEditingProvider(null); }}
                    onSubmit={handleSubmit}
                />
            )}

            {viewCredentials && (
                <CredentialsModal
                    provider={viewCredentials}
                    onClose={() => setViewCredentials(null)}
                />
            )}
        </div>
    );
}

function ProviderModal({ provider, type, onClose, onSubmit }) {
    const [selectedProvider, setSelectedProvider] = useState(provider?.provider || '');
    const [name, setName] = useState(provider?.name || '');
    const [credentials, setCredentials] = useState({});

    const providerOptions = PROVIDERS_BY_TYPE[type] || [];
    const selectedConfig = providerOptions.find(p => p.value === selectedProvider);

    const handleCredentialChange = (field, value) => {
        setCredentials({ ...credentials, [field]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            type,
            provider: selectedProvider,
            name,
            credentials
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{provider ? 'Edit Provider' : 'Add Provider'}</h3>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Provider *</label>
                            <select className="form-input" value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} required>
                                <option value="">Select provider...</option>
                                {providerOptions.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Display Name</label>
                            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="My Provider" />
                        </div>

                        {selectedConfig && (
                            <>
                                <hr style={{ borderColor: 'var(--border)', margin: '20px 0' }} />
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Credentials (encrypted on save)</p>
                                {selectedConfig.fields.map(field => (
                                    <div className="form-group" key={field}>
                                        <label className="form-label">{field}</label>
                                        <input
                                            type={field.toLowerCase().includes('password') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('token') ? 'password' : 'text'}
                                            className="form-input"
                                            value={credentials[field] || ''}
                                            onChange={e => handleCredentialChange(field, e.target.value)}
                                            placeholder={`Enter ${field}`}
                                        />
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{provider ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CredentialsModal({ provider, onClose }) {
    const [show, setShow] = useState(false);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Credentials: {provider.name || provider.provider}</h3>
                    <button className="btn btn-sm btn-secondary" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <button className="btn btn-sm btn-secondary" onClick={() => setShow(!show)} style={{ marginBottom: 16 }}>
                        {show ? <><FiEyeOff /> Hide</> : <><FiEye /> Show</>}
                    </button>

                    {show ? (
                        <pre style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
                            {JSON.stringify(provider.credentials, null, 2)}
                        </pre>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Click "Show" to reveal credentials</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
