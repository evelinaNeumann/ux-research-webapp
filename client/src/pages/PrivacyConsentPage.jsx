import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { adminApi } from '../api/admin';
import './AuthPage.css';

export function PrivacyConsentPage({ user, onAuth }) {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const needsConsent = user?.role === 'user' && !!user?.requires_privacy_consent;
  const hasPriorConsent =
    !!user?.privacy_notice_acknowledged_at || !!user?.study_data_consent_at || !!user?.privacy_policy_version_acknowledged;
  const [policy, setPolicy] = useState(null);
  const [adminDraft, setAdminDraft] = useState({
    version: '',
    date: '',
    text: '',
    privacy_ack_label: '',
    study_consent_label: '',
  });
  const [adminInfo, setAdminInfo] = useState('');
  const [acceptedPrivacyNotice, setAcceptedPrivacyNotice] = useState(false);
  const [acceptedStudyDataConsent, setAcceptedStudyDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await authApi.privacyPolicy();
        setPolicy(data);
        setAdminDraft({
          version: data?.version || '',
          date: data?.date || '',
          text: data?.text || '',
          privacy_ack_label: data?.privacy_ack_label || '',
          study_consent_label: data?.study_consent_label || '',
        });
      } catch (err) {
        setError(err.message || 'Datenschutzerklaerung konnte nicht geladen werden.');
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (isAdmin) return;
    if (!needsConsent) {
      navigate('/');
      return;
    }
    setError('');
    if (!acceptedPrivacyNotice || !acceptedStudyDataConsent) {
      setError('Bitte beide Pflichtbestaetigungen aktivieren.');
      return;
    }
    try {
      setSaving(true);
      const result = await authApi.submitPrivacyConsent({
        accepted_privacy_notice: true,
        accepted_study_data_consent: true,
      });
      onAuth(result?.user || user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Einwilligung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const saveAdminPolicy = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      setError('');
      setAdminInfo('');
      const updated = await adminApi.updatePrivacyPolicy(adminDraft);
      setPolicy(updated);
      setAdminDraft({
        version: updated?.version || '',
        date: updated?.date || '',
        text: updated?.text || '',
        privacy_ack_label: updated?.privacy_ack_label || '',
        study_consent_label: updated?.study_consent_label || '',
      });
      setAdminInfo('Datenschutzrichtlinien gespeichert. Nutzer muessen bei Aenderungen erneut zustimmen.');
    } catch (err) {
      setError(err.message || 'Datenschutzrichtlinien konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card consent-card" onSubmit={submit}>
        <h2>{isAdmin ? 'Datenschutz' : 'Datenschutz und Einwilligung'}</h2>
        {error && <p className="error-text">{error}</p>}
        {isAdmin && adminInfo && <p className="hint">{adminInfo}</p>}
        {needsConsent && hasPriorConsent && (
          <p className="error-text">Unsere Datenschutzrichtlinien wurden aktualisiert, bitte stimme erneut zu.</p>
        )}
        <p className="hint">
          {needsConsent
            ? 'Bitte lies die Datenschutzerklaerung und bestaetige beide Pflichtpunkte, um die App zu nutzen.'
            : isAdmin
              ? 'Hier kannst du den Text der Datenschutzrichtlinien bearbeiten.'
              : 'Du kannst die Datenschutzerklaerung hier jederzeit einsehen.'}
        </p>
        {!isAdmin && (
          <div className="privacy-text-box">
            <pre>{policy?.text || 'Lade Datenschutzerklaerung...'}</pre>
          </div>
        )}

        {isAdmin && (
          <div className="policy-editor-wrap">
            <div className="policy-editor-grid">
              <label className="policy-field">
                <span>Version</span>
                <input
                  value={adminDraft.version}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, version: e.target.value }))}
                  placeholder="z. B. 1.1"
                />
              </label>
              <label className="policy-field">
                <span>Stand (Datum)</span>
                <input
                  value={adminDraft.date}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, date: e.target.value }))}
                  placeholder="TT.MM.JJJJ"
                />
              </label>
            </div>
            <label className="policy-field">
              <span>Datenschutzrichtlinien</span>
              <textarea
                className="policy-textarea"
                rows={14}
                value={adminDraft.text}
                onChange={(e) => setAdminDraft((prev) => ({ ...prev, text: e.target.value }))}
              />
            </label>
            <label className="policy-field">
              <span>Pflichtbestaetigung Datenschutz</span>
              <textarea
                rows={3}
                value={adminDraft.privacy_ack_label}
                onChange={(e) => setAdminDraft((prev) => ({ ...prev, privacy_ack_label: e.target.value }))}
              />
            </label>
            <label className="policy-field">
              <span>Pflichtbestaetigung Studienverarbeitung</span>
              <textarea
                rows={4}
                value={adminDraft.study_consent_label}
                onChange={(e) => setAdminDraft((prev) => ({ ...prev, study_consent_label: e.target.value }))}
              />
            </label>
            <button type="button" className="primary-btn" onClick={saveAdminPolicy} disabled={saving}>
              {saving ? 'Speichern...' : 'Datenschutzrichtlinien speichern'}
            </button>
          </div>
        )}

        {needsConsent && (
          <>
            <label className="consent-check-row">
              <input
                type="checkbox"
                checked={acceptedPrivacyNotice}
                onChange={(e) => setAcceptedPrivacyNotice(e.target.checked)}
              />
              <span>
                {policy?.privacy_ack_label ||
                  'Ich habe die Datenschutzerklaerung gelesen und zur Kenntnis genommen.'}
              </span>
            </label>

            <label className="consent-check-row">
              <input
                type="checkbox"
                checked={acceptedStudyDataConsent}
                onChange={(e) => setAcceptedStudyDataConsent(e.target.checked)}
              />
              <span>
                {policy?.study_consent_label ||
                  'Ich willige in die Verarbeitung meiner Studiendaten fuer Auswertung und Projektarbeit ein.'}
              </span>
            </label>
          </>
        )}

        {!isAdmin && (
          <button type="submit" className="primary-btn" disabled={saving}>
            {needsConsent ? (saving ? 'Speichern...' : 'Zustimmung speichern') : 'Zurueck zum Dashboard'}
          </button>
        )}
      </form>
    </div>
  );
}
