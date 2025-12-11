import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '../api';
import { FiUsers, FiDollarSign, FiFileText, FiMail, FiArrowUpRight } from 'react-icons/fi';
import { format } from 'date-fns';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await dashboard.getStats();
            setStats(res.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's your business overview.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4" style={{ marginBottom: 32 }}>
                <div className="stat-card">
                    <div className="stat-icon primary"><FiUsers /></div>
                    <div className="stat-value">{stats?.clients || 0}</div>
                    <div className="stat-label">Total Clients</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success"><FiDollarSign /></div>
                    <div className="stat-value">{formatCurrency(stats?.totalRevenue)}</div>
                    <div className="stat-label">Total Revenue</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning"><FiFileText /></div>
                    <div className="stat-value">{formatCurrency(stats?.pendingRevenue)}</div>
                    <div className="stat-label">Pending Invoices</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon info"><FiMail /></div>
                    <div className="stat-value">{stats?.messagesThisMonth || 0}</div>
                    <div className="stat-label">Messages This Month</div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Invoices</h3>
                        <Link to="/invoices" className="btn btn-sm btn-secondary">
                            View All <FiArrowUpRight />
                        </Link>
                    </div>
                    {stats?.recentInvoices?.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Number</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentInvoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td><Link to={`/invoices/${inv.id}`}>{inv.number}</Link></td>
                                            <td>{inv.client?.name}</td>
                                            <td>{formatCurrency(inv.total)}</td>
                                            <td>
                                                <span className={`badge badge-${getStatusClass(inv.status)}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiFileText className="empty-state-icon" />
                            <p>No invoices yet</p>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Clients</h3>
                        <Link to="/clients" className="btn btn-sm btn-secondary">
                            View All <FiArrowUpRight />
                        </Link>
                    </div>
                    {stats?.recentClients?.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Company</th>
                                        <th>Added</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentClients.map(client => (
                                        <tr key={client.id}>
                                            <td><Link to={`/clients/${client.id}`}>{client.name}</Link></td>
                                            <td>{client.company || '-'}</td>
                                            <td>{format(new Date(client.createdAt), 'MMM d, yyyy')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiUsers className="empty-state-icon" />
                            <p>No clients yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getStatusClass(status) {
    switch (status) {
        case 'PAID': return 'success';
        case 'SENT': return 'info';
        case 'OVERDUE': return 'danger';
        case 'DRAFT': return 'default';
        default: return 'default';
    }
}
