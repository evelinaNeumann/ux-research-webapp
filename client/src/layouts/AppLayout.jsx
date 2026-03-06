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
        <div className="sidebar-groups">
          <section className="sidebar-card">
            <h2>Nutzer</h2>
            <nav>
              <Link to="/">Dashboard</Link>
              <Link to="/my-profile-data">Meine Profildaten</Link>
              <Link to="/user-data">Userdaten ändern</Link>
            </nav>
          </section>

          {user?.role === 'admin' && (
            <section className="sidebar-card">
              <h2>Studien</h2>
              <nav>
                <Link to="/admin/mixed">Mixed Studie</Link>
                <Link to="/admin">Studien Admin Center</Link>
                <Link to="/admin/analytics">Studien Auswertungen</Link>
              </nav>
            </section>
          )}

          <section className="sidebar-card">
            <h2>Sicherheit</h2>
            <nav>
              {user?.role === 'admin' && <Link to="/admin/users">Benutzer & Rollen</Link>}
              <Link to="/privacy-consent">Datenschutz</Link>
            </nav>
          </section>
        </div>
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
