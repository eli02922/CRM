import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/leads', label: 'Leads' },
  { to: '/customers', label: 'Customers' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/activities', label: 'Activities' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">CRM</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>{user?.name}</strong> <span className="badge">{user?.role}</span>
          </div>
          <button onClick={logout} className="btn-secondary">
            Log out
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
