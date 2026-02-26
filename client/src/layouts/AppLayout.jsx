import { Link, Outlet, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import './AppLayout.css';

export function AppLayout({ user }) {
  const navigate = useNavigate();

  const logout = async () => {
    await authApi.logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <h1>UX Research</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          {user?.role === 'admin' && <Link to="/admin/users">Benutzer & Rollen</Link>}
          {user?.role === 'admin' && <Link to="/admin/analytics">Studien Auswertungen</Link>}
          <Link to="/my-profile-data">Meine Profil Data</Link>
          <Link to="/user-data">Passwort ändern</Link>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        </nav>
        <button onClick={logout} className="ghost-btn">Logout</button>
      </aside>
      <main className="layout-main">
        <div className="layout-topbar">
          <span className="login-info">Angemeldet als: {user?.username || '-'}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
