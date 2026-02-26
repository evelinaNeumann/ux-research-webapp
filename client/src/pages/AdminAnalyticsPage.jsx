import { useEffect, useMemo, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { studyApi } from '../api/studies';
import { analyticsApi } from '../api/analytics';
import './AdminAnalyticsPage.css';

export function AdminAnalyticsPage() {
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState('');
  const [overview, setOverview] = useState(null);
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await studyApi.list();
        setStudies(res.items || []);
        if (res.items?.[0]?._id) setSelectedStudy(res.items[0]._id);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedStudy) return;
      try {
        const [o, c] = await Promise.all([
          analyticsApi.studyOverview(selectedStudy),
          analyticsApi.studyChart(selectedStudy),
        ]);
        setOverview(o);
        setChart(c);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [selectedStudy]);

  const selectedStudyName = useMemo(
    () => studies.find((s) => s._id === selectedStudy)?.name || 'Keine Studie',
    [studies, selectedStudy]
  );

  return (
    <div className="analytics-shell">
      <CardPanel title="Studien Auswertungen">
        <div className="analytics-toolbar">
          <label className="form-field">
            <span>Studie wählen</span>
            <select value={selectedStudy} onChange={(e) => setSelectedStudy(e.target.value)}>
              {studies.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="analytics-actions">
            <button
              className="primary-btn"
              onClick={() => window.open(`http://localhost:4000/analytics/export?format=csv&studyId=${selectedStudy}`, '_blank')}
            >
              CSV Export
            </button>
            <button
              className="ghost-btn"
              onClick={() => window.open(`http://localhost:4000/analytics/export?format=json&studyId=${selectedStudy}`, '_blank')}
            >
              JSON Export
            </button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <p className="hint">Auswertung für: <strong>{selectedStudyName}</strong></p>
      </CardPanel>

      {overview && (
        <div className="kpi-grid">
          <CardPanel title="Teilnahmen">
            <div className="kpi-value">{overview.sessions_total ?? 0}</div>
          </CardPanel>
          <CardPanel title="Abgeschlossen">
            <div className="kpi-value">{overview.sessions_done ?? 0}</div>
          </CardPanel>
          <CardPanel title="Abschlussrate">
            <div className="kpi-value">{overview.completion_rate ?? 0}%</div>
          </CardPanel>
        </div>
      )}

      {chart && (
        <CardPanel title="Chart (Study View)">
          <div className="bar-wrap">
            {chart.labels?.map((label, idx) => {
              const value = chart.series?.[idx] || 0;
              const max = Math.max(...(chart.series || [1]), 1);
              const width = Math.round((value / max) * 100);
              return (
                <div key={label} className="bar-row">
                  <span>{label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </CardPanel>
      )}

      {overview?.questionnaire?.length > 0 && (
        <CardPanel title="Interview Aggregation">
          {overview.questionnaire.map((q) => (
            <div key={q._id} className="list-row">
              <span>{String(q._id)}</span>
              <small>avg: {Number(q.avg || 0).toFixed(2)} • n: {q.n}</small>
            </div>
          ))}
        </CardPanel>
      )}

      {overview?.image_rating?.length > 0 && (
        <CardPanel title="Bildbewertung Aggregation">
          {overview.image_rating.map((i) => (
            <div key={i._id} className="list-row">
              <span>{String(i._id)}</span>
              <small>avg: {Number(i.avg || 0).toFixed(2)} • n: {i.n}</small>
            </div>
          ))}
        </CardPanel>
      )}
    </div>
  );
}
