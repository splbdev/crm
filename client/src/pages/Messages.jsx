import { useState, useEffect } from 'react';
import { messages, clients as clientsApi } from '../api';
import { FiSend, FiMail, FiMessageSquare, FiSmartphone } from 'react-icons/fi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Messages() {
    const [messageList, setMessageList] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('compose');
    const [filter, setFilter] = useState('');

    useEffect(() => { loadData(); }, [filter]);

    const loadData = async () => {
        try {
            const [msgRes, clientRes] = await Promise.all([
                messages.getAll({ type: filter || undefined, limit: 100 }),
                clientsApi.getAll({ limit: 100 })
            ]);
            setMessageList(msgRes.data.messages);
            setClients(clientRes.data.clients);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Messaging Center</h1>
                    <p className="page-subtitle">Send and manage communications</p>
                </div>
            </div>

            <div className="grid grid-2" style={{ gap: 32 }}>
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Compose Message</h3>
                    </div>
                    <ComposeForm clients={clients} onSent={loadData} />
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Message History</h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['', 'SMS', 'EMAIL', 'WHATSAPP'].map(t => (
                                <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(t)}>
                                    {t || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : messageList.length > 0 ? (
                        <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            {messageList.map(msg => (
                                <div key={msg.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        {msg.type === 'SMS' && <FiSmartphone />}
                                        {msg.type === 'EMAIL' && <FiMail />}
                                        {msg.type === 'WHATSAPP' && <FiMessageSquare />}
                                        <strong style={{ flex: 1 }}>{msg.to}</strong>
                                        <span className={`badge badge-${msg.status === 'SENT' ? 'success' : msg.status === 'FAILED' ? 'danger' : 'default'}`}>
                                            {msg.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        {format(new Date(msg.createdAt), 'MMM d, yyyy h:mm a')}
                                    </div>
                                    <div style={{ fontSize: 14 }}>
                                        {msg.type === 'EMAIL' ? (
                                            JSON.parse(msg.content || '{}').subject || 'No subject'
                                        ) : (
                                            msg.content?.substring(0, 100)
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No messages yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ComposeForm({ clients, onSent }) {
    const [type, setType] = useState('SMS');
    const [recipient, setRecipient] = useState('');
    const [clientId, setClientId] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleClientSelect = (id) => {
        setClientId(id);
        const client = clients.find(c => c.id === id);
        if (client) {
            if (type === 'EMAIL') {
                setRecipient(client.email || '');
            } else {
                setRecipient(client.phone || '');
            }
        }
    };

    const handleSend = async () => {
        if (!recipient || !message) {
            toast.error('Recipient and message are required');
            return;
        }

        setSending(true);
        try {
            let result;
            if (type === 'SMS') {
                result = await messages.sendSMS({ to: recipient, message, clientId: clientId || undefined });
            } else if (type === 'EMAIL') {
                result = await messages.sendEmail({ to: recipient, subject, html: message, clientId: clientId || undefined });
            } else if (type === 'WHATSAPP') {
                result = await messages.sendWhatsApp({ to: recipient, message, clientId: clientId || undefined });
            }

            if (result.data.success) {
                toast.success('Message sent!');
                setMessage('');
                setSubject('');
                onSent();
            } else {
                toast.error(result.data.error || 'Failed to send');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <div className="form-group">
                <label className="form-label">Message Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['SMS', 'EMAIL', 'WHATSAPP'].map(t => (
                        <button key={t} className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setType(t)}>
                            {t === 'SMS' && <FiSmartphone />}
                            {t === 'EMAIL' && <FiMail />}
                            {t === 'WHATSAPP' && <FiMessageSquare />}
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Select Client (optional)</label>
                <select className="form-input" value={clientId} onChange={e => handleClientSelect(e.target.value)}>
                    <option value="">Manual entry...</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {type === 'EMAIL' ? c.email : c.phone}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Recipient *</label>
                <input
                    type={type === 'EMAIL' ? 'email' : 'tel'}
                    className="form-input"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    placeholder={type === 'EMAIL' ? 'email@example.com' : '+1234567890'}
                />
            </div>

            {type === 'EMAIL' && (
                <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <input
                        type="text"
                        className="form-input"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Email subject"
                    />
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea
                    className="form-input"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={5}
                />
            </div>

            <button className="btn btn-primary" onClick={handleSend} disabled={sending} style={{ width: '100%' }}>
                <FiSend /> {sending ? 'Sending...' : 'Send Message'}
            </button>
        </div>
    );
}
