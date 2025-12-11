import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiUsers, FiFileText, FiDollarSign, FiMail,
    FiSettings, FiLogOut, FiLayers, FiBook
} from 'react-icons/fi';
import './Layout.css';

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: FiHome, label: 'Dashboard' },
        { to: '/clients', icon: FiUsers, label: 'Clients' },
        { to: '/invoices', icon: FiDollarSign, label: 'Invoices' },
        { to: '/estimates', icon: FiFileText, label: 'Estimates' },
        { to: '/proposals', icon: FiBook, label: 'Proposals' },
        { to: '/templates', icon: FiLayers, label: 'Templates' },
        { to: '/messages', icon: FiMail, label: 'Messages' },
        { to: '/settings', icon: FiSettings, label: 'Settings' }
    ];

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">⚡</span>
                        <span className="logo-text">CRM Pro</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Icon className="nav-icon" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <div className="user-details">
                            <div className="user-name">{user?.name || 'User'}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FiLogOut />
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
