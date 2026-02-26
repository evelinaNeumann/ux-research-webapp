import { useEffect, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { adminApi } from '../api/admin';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const usersRes = await adminApi.listUsers();
      setUsers(usersRes || []);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="admin-users-shell">
      <CardPanel title="Benutzer & Rollen">
        {error && <p className="error-text">{error}</p>}
        {users.map((u) => (
          <div key={u._id} className="row-item">
            <div>
              <strong>{u.username}</strong>
              <small>{u.role}</small>
            </div>
            <div className="row-actions">
              <select
                value={u.role}
                onChange={async (e) => {
                  const role = e.target.value;
                  await adminApi.setUserRole(u._id, role);
                  await loadUsers();
                }}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                className="danger-btn"
                onClick={async () => {
                  const ok = window.confirm(`Nutzer ${u.username} wirklich löschen?`);
                  if (!ok) return;
                  await adminApi.deleteUser(u._id);
                  await loadUsers();
                }}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
