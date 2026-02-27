import { useEffect, useRef, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { adminApi } from '../api/admin';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [profilesByUser, setProfilesByUser] = useState({});
  const [openUserId, setOpenUserId] = useState('');
  const [error, setError] = useState('');
  const handlingResetPromptsRef = useRef(false);

  const handlePendingResetRequests = async () => {
    if (handlingResetPromptsRef.current) return;
    handlingResetPromptsRef.current = true;
    try {
      const pending = await adminApi.listPasswordResetRequests();
      if (!Array.isArray(pending) || pending.length === 0) return;
      for (const user of pending) {
        const username = user?.username || 'unbekannt';
        const ok = window.confirm(`User "${username}" Passwort neu vergeben erlauben?`);
        await adminApi.decidePasswordResetRequest(user._id, ok ? 'approve' : 'deny');
      }
      const usersRes = await adminApi.listUsers();
      setUsers(usersRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      handlingResetPromptsRef.current = false;
    }
  };

  const loadUsers = async (showResetPopups = false) => {
    try {
      const usersRes = await adminApi.listUsers();
      setUsers(usersRes || []);
      setError('');
      if (showResetPopups) {
        await handlePendingResetRequests();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, []);

  const loadProfiles = async (userId) => {
    const items = await adminApi.listUserProfiles(userId);
    setProfilesByUser((prev) => ({ ...prev, [userId]: items || [] }));
  };

  return (
    <div className="admin-users-shell">
      <CardPanel title="Benutzer & Rollen">
        {error && <p className="error-text">{error}</p>}
        {users.map((u) => (
          <div key={u._id} className="user-block">
            <div className="row-item">
              <div>
                <strong>{u.username}</strong>
                <small>{u.role}</small>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={async () => {
                    if (openUserId === u._id) {
                      setOpenUserId('');
                      return;
                    }
                    await loadProfiles(u._id);
                    setOpenUserId(u._id);
                  }}
                >
                  {openUserId === u._id ? 'Profile ausblenden' : 'Profile anzeigen'}
                </button>
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
                    await loadUsers(false);
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>

            {openUserId === u._id && (
              <div className="profiles-box">
                {(profilesByUser[u._id] || []).length === 0 && <small>Keine Profilangaben gespeichert.</small>}
                {(profilesByUser[u._id] || []).map((p) => (
                  <div key={p._id} className="profile-row">
                    <div>
                      <strong>{p.study_id?.name || 'Studie'}</strong>
                      <small>Alter: {p.age_range}</small>
                      <small>Rolle: {p.role_category}{p.role_custom ? ` (${p.role_custom})` : ''}</small>
                      <small>Wichtige Wörter: {(p.key_points || []).join(', ')}</small>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={async () => {
                        try {
                          const age_range = window.prompt('Alter-Range', p.age_range) || p.age_range;
                          const role_category = window.prompt(
                            'Rolle (schueler_azubi_student | angestellter_fachabteilung | leitende_position | other)',
                            p.role_category
                          ) || p.role_category;
                          const role_custom = window.prompt('Eigene Rolle (nur bei other)', p.role_custom || '') || p.role_custom || '';
                          const keyPointsRaw = window.prompt(
                            '4 wichtige Wörter (kommagetrennt)',
                            (p.key_points || []).join(', ')
                          ) || (p.key_points || []).join(', ');
                          const key_points = keyPointsRaw
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean)
                            .slice(0, 4);

                          await adminApi.updateUserProfile(u._id, p.study_id?._id || p.study_id, {
                            age_range,
                            role_category,
                            role_custom,
                            key_points,
                          });
                          await loadProfiles(u._id);
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    >
                      Profil bearbeiten
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
