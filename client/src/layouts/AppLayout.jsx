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
          <Link to="/user-data">Meine User Data</Link>
          {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        </nav>
        <button onClick={logout} className="ghost-btn">Logout</button>
      </aside>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
