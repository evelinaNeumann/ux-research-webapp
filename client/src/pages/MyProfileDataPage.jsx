import { useEffect, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { profileApi } from '../api/profile';
import './MyProfileDataPage.css';

const ROLE_LABEL = {
  schueler_azubi_student: 'Schüler/Azubi/Student',
  angestellter_fachabteilung: 'Angestellter aus Fachabteilung',
  leitende_position: 'Leitender Position',
  other: 'kein treffer (eigene Eingabe)',
};

export function MyProfileDataPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await profileApi.getMyProfiles();
        setItems(data || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  return (
    <div className="profile-data-shell">
      <CardPanel title="Meine Profil Data">
        {error && <p className="error-text">{error}</p>}
        {items.length === 0 && <p className="hint">Noch keine Profilangaben gespeichert.</p>}

        {items.map((p) => (
          <div key={p._id} className="profile-row">
            <div>
              <strong>{p.study_id?.name || 'Studie'}</strong>
              <small>Alter: {p.age_range}</small>
              <small>
                Rolle: {ROLE_LABEL[p.role_category] || p.role_category}
                {p.role_category === 'other' && p.role_custom ? ` (${p.role_custom})` : ''}
              </small>
              <small>Wichtige Wörter: {(p.key_points || []).join(', ')}</small>
            </div>
          </div>
        ))}
      </CardPanel>
    </div>
  );
}
