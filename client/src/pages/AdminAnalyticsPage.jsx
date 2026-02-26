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
  const [portraits, setPortraits] = useState(null);
  const [portraitFilters, setPortraitFilters] = useState({ age: '', role: '', keyword: '' });
  const [profileInsightsOpen, setProfileInsightsOpen] = useState(true);
  const [modulesOpen, setModulesOpen] = useState(true);
  const [activeModuleTab, setActiveModuleTab] = useState('questionnaire');
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
        const filterPayload = {
          age: portraitFilters.age,
          role: portraitFilters.role,
          keyword: portraitFilters.keyword,
        };
        const [o, c, p] = await Promise.all([
          analyticsApi.studyOverview(selectedStudy, filterPayload),
          analyticsApi.studyChart(selectedStudy, filterPayload),
          analyticsApi.studyUserPortraits(selectedStudy),
        ]);
        setOverview(o);
        setChart(c);
        setPortraits(p);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [selectedStudy, portraitFilters.age, portraitFilters.role, portraitFilters.keyword]);

  const selectedStudyName = useMemo(
    () => studies.find((s) => s._id === selectedStudy)?.name || 'Keine Studie',
    [studies, selectedStudy]
  );

  const roleKey = (roleCategory, roleCustom) => {
    if (roleCategory === 'other') return `other:${roleCustom || 'ohne Angabe'}`;
    return roleCategory || '';
  };

  const roleLabel = (roleCategory, roleCustom) => {
    if (String(roleCategory || '').startsWith('other:')) {
      const custom = String(roleCategory).slice('other:'.length);
      return custom ? `Eigene Rolle: ${custom}` : 'Eigene Rolle';
    }
    if (roleCategory === 'schueler_azubi_student') return 'Schüler/Azubi/Student';
    if (roleCategory === 'angestellter_fachabteilung') return 'Angestellter aus Fachabteilung';
    if (roleCategory === 'leitende_position') return 'Leitende Position';
    if (roleCategory === 'other') return roleCustom ? `Eigene Rolle: ${roleCustom}` : 'Eigene Rolle';
    return roleCategory || '-';
  };

  const ageOptions = useMemo(() => {
    const list = portraits?.items?.map((x) => x.age_range).filter(Boolean) || [];
    return [...new Set(list)];
  }, [portraits]);

  const roleOptions = useMemo(() => {
    const list =
      portraits?.items?.map((x) => roleKey(x.role_category, x.role_custom)).filter(Boolean) || [];
    return [...new Set(list)];
  }, [portraits]);

  const keywordOptions = useMemo(() => {
    const list = (portraits?.items || []).flatMap((x) => x.key_points || []);
    return [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [portraits]);

  const filteredPortraitItems = useMemo(() => {
    const items = portraits?.items || [];
    return items.filter((x) => {
      const byAge = portraitFilters.age ? x.age_range === portraitFilters.age : true;
      const byRole = portraitFilters.role
        ? roleKey(x.role_category, x.role_custom) === portraitFilters.role
        : true;
      const byKeyword = portraitFilters.keyword
        ? (x.key_points || []).includes(portraitFilters.keyword)
        : true;
      return byAge && byRole && byKeyword;
    });
  }, [portraits, portraitFilters]);

  const filteredAggregates = useMemo(() => {
    const ageMap = {};
    const roleMap = {};
    const keywordMap = {};
    for (const p of filteredPortraitItems) {
      if (p.age_range) ageMap[p.age_range] = (ageMap[p.age_range] || 0) + 1;
      const rk = roleKey(p.role_category, p.role_custom);
      if (rk) roleMap[rk] = (roleMap[rk] || 0) + 1;
      for (const word of p.key_points || []) {
        keywordMap[word] = (keywordMap[word] || 0) + 1;
      }
    }
    const toRows = (obj) =>
      Object.entries(obj)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
    return {
      age_ranges: toRows(ageMap),
      roles: toRows(roleMap),
      key_points: toRows(keywordMap),
    };
  }, [filteredPortraitItems]);

  const filteredProfileCount = filteredPortraitItems.length;
  const renderDistributionBars = (rows, labelFn) => {
    if (!rows?.length) return <p>Keine Daten für den gewählten Filter.</p>;
    const max = Math.max(...rows.map((r) => r.count), 1);
    return (
      <div className="dist-wrap">
        {rows.map((row) => {
          const width = Math.round((row.count / max) * 100);
          const percent = filteredProfileCount > 0 ? Math.round((row.count / filteredProfileCount) * 100) : 0;
          return (
            <div key={row.key} className="dist-row">
              <span className="dist-label">{labelFn(row.key)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${width}%` }} />
              </div>
              <strong className="dist-value">{row.count} ({percent}%)</strong>
            </div>
          );
        })}
      </div>
    );
  };
  const renderCountBars = (rows, labelFn, emptyText = 'Keine Daten vorhanden.') => {
    if (!rows?.length) return <p>{emptyText}</p>;
    const max = Math.max(...rows.map((r) => r.count), 1);
    return (
      <div className="dist-wrap">
        {rows.map((row, idx) => {
          const width = Math.round((row.count / max) * 100);
          return (
            <div key={`${labelFn(row)}-${idx}`} className="dist-row">
              <span className="dist-label">{labelFn(row)}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${width}%` }} />
              </div>
              <strong className="dist-value">{row.count}</strong>
            </div>
          );
        })}
      </div>
    );
  };
  const renderPieChart = (rows, labelFn, emptyText = 'Keine Daten vorhanden.') => {
    if (!rows?.length) return <p>{emptyText}</p>;
    const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    if (total <= 0) return <p>{emptyText}</p>;
    const palette = ['#1d4ed8', '#f59e0b', '#16a34a', '#db2777', '#0ea5e9', '#7c3aed', '#ef4444', '#14b8a6'];
    let current = 0;
    const segments = rows.map((row, idx) => {
      const value = Number(row.count) || 0;
      const start = current;
      const fraction = value / total;
      current += fraction;
      return {
        label: labelFn(row),
        value,
        percent: Math.round(fraction * 100),
        color: palette[idx % palette.length],
        start,
        end: current,
      };
    });
    const gradient = segments
      .map((s) => `${s.color} ${(s.start * 100).toFixed(2)}% ${(s.end * 100).toFixed(2)}%`)
      .join(', ');

    return (
      <div className="pie-block">
        <div className="pie-chart" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="pie-legend">
          {segments.map((s) => (
            <div key={s.label} className="pie-legend-row">
              <span className="pie-dot" style={{ background: s.color }} />
              <span className="pie-label">{s.label}</span>
              <strong className="pie-value">{s.value} ({s.percent}%)</strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const portraitExportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (portraitFilters.age) params.set('age', portraitFilters.age);
    if (portraitFilters.role) params.set('role', portraitFilters.role);
    if (portraitFilters.keyword) params.set('keyword', portraitFilters.keyword);
    return params.toString();
  }, [portraitFilters]);

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

      {portraits && (
        <CardPanel title="Filter (Profile und Studienmodule)">
          <div className="analytics-toolbar">
            <p className="hint">Filter wirken auf User Portraits, Profil-Daten Auswertung und Studienmodule.</p>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setPortraitFilters({ age: '', role: '', keyword: '' })}
            >
              Filter zurücksetzen
            </button>
          </div>
          <div className="profile-filter-grid">
            <label className="form-field">
              <span>Alter</span>
              <select
                value={portraitFilters.age}
                onChange={(e) => setPortraitFilters((prev) => ({ ...prev, age: e.target.value }))}
              >
                <option value="">Alle</option>
                {ageOptions.map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Rolle</span>
              <select
                value={portraitFilters.role}
                onChange={(e) => setPortraitFilters((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="">Alle</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{roleLabel(role, '')}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Wichtiges Wort</span>
              <select
                value={portraitFilters.keyword}
                onChange={(e) => setPortraitFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              >
                <option value="">Alle</option>
                {keywordOptions.map((keyword) => (
                  <option key={keyword} value={keyword}>{keyword}</option>
                ))}
              </select>
            </label>
          </div>
        </CardPanel>
      )}

      {overview && (
        <CardPanel title="Studienmodule">
          <div className="analytics-collapse-header">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setModulesOpen((v) => !v)}
            >
              {modulesOpen ? 'Zuklappen' : 'Aufklappen'}
            </button>
          </div>
          {modulesOpen && (
            <>
              <div className="modules-top-row">
                <div className="module-tabs">
                  <button
                    type="button"
                    className={activeModuleTab === 'questionnaire' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveModuleTab('questionnaire')}
                  >
                    Interview
                  </button>
                  <button
                    type="button"
                    className={activeModuleTab === 'card_sort' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveModuleTab('card_sort')}
                  >
                    Card Sorting
                  </button>
                  <button
                    type="button"
                    className={activeModuleTab === 'image_rating' ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveModuleTab('image_rating')}
                  >
                    Bildauswertung
                  </button>
                </div>
                <div className="analytics-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:4000/analytics/study/${selectedStudy}/modules/export?format=pdf${portraitExportQuery ? `&${portraitExportQuery}` : ''}`,
                        '_blank'
                      )
                    }
                  >
                    Studienmodule PDF Export
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:4000/analytics/study/${selectedStudy}/modules/export?format=json${portraitExportQuery ? `&${portraitExportQuery}` : ''}`,
                        '_blank'
                      )
                    }
                  >
                    Studienmodule JSON Export
                  </button>
                </div>
              </div>

              {activeModuleTab === 'questionnaire' && (
                <div>
                  {overview.questionnaire?.length > 0 ? (
                    overview.questionnaire.map((q) => (
                      <div key={q._id} className="qa-block">
                        <p className="qa-question">{q.question_text || String(q._id)}</p>
                        <small>Antworten gesamt: {q.n ?? 0}</small>
                        {(q.answers || []).length > 0 ? (
                          <div className="qa-answer-list">
                            {q.answers.map((answer, idx) => (
                              <div key={`${q._id}-${idx}`} className="list-row">
                                <span>{answer}</span>
                                <small>#{idx + 1}</small>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p>Keine Antworten vorhanden.</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>Keine Interview-Daten vorhanden.</p>
                  )}
                </div>
              )}

              {activeModuleTab === 'card_sort' && (
                <div className="module-stack">
                  <div className="kpi-grid compact">
                    <article className="mini-kpi">
                      <span>Submissions gesamt</span>
                      <strong>{overview.card_sort_submissions ?? 0}</strong>
                    </article>
                    <article className="mini-kpi">
                      <span>Aktuelle Session-Stände</span>
                      <strong>{overview.card_sort?.latest_session_submissions ?? 0}</strong>
                    </article>
                    <article className="mini-kpi">
                      <span>User-Ideen: eigene Spalten</span>
                      <strong>{overview.card_sort?.user_idea?.custom_columns_total ?? 0}</strong>
                    </article>
                    <article className="mini-kpi">
                      <span>User-Ideen: eigene Karten</span>
                      <strong>{overview.card_sort?.user_idea?.custom_cards_total ?? 0}</strong>
                    </article>
                  </div>

                  <div className="modules-data-grid">
                    <section className="qa-block">
                      <p className="qa-question">Diagramm: Zuordnungen je Spalte</p>
                      {renderPieChart(
                        overview.card_sort?.column_distribution || [],
                        (row) => row.column,
                        'Keine Card-Sorting-Daten vorhanden.'
                      )}
                    </section>

                    <section className="qa-block">
                      <p className="qa-question">Diagramm: Kartenhäufigkeit (Top)</p>
                      {renderPieChart(
                        (overview.card_sort?.card_distribution || []).slice(0, 20),
                        (row) => row.card_label,
                        'Keine Kartenzuordnungen vorhanden.'
                      )}
                    </section>

                    <section className="qa-block modules-data-grid-full">
                      <p className="qa-question">Spaltenansicht: Welche Cards wurden wohin zugeordnet?</p>
                      {(overview.card_sort?.column_card_distribution || []).length > 0 ? (
                        <div className="column-card-grid">
                          {overview.card_sort.column_card_distribution.map((columnRow) => (
                            <article key={columnRow.column} className="qa-block qa-nested">
                              <p className="qa-question">{columnRow.column} <small>({columnRow.total})</small></p>
                              {renderPieChart(
                                columnRow.cards || [],
                                (row) => row.card_label,
                                'Keine Karten in dieser Spalte.'
                              )}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p>Keine Spalten-/Kartenzuordnungen vorhanden.</p>
                      )}
                    </section>

                    <section className="qa-block modules-data-grid-full">
                      <p className="qa-question">Card-Ansicht: Zu welcher Spalte wurde jede Card wie oft zugeordnet?</p>
                      {(overview.card_sort?.card_column_distribution || []).length > 0 ? (
                        <div className="column-card-grid">
                          {overview.card_sort.card_column_distribution.map((cardRow) => (
                            <article key={cardRow.card_label} className="qa-block qa-nested">
                              <p className="qa-question">{cardRow.card_label} <small>({cardRow.total})</small></p>
                              {renderPieChart(
                                cardRow.columns || [],
                                (row) => row.column,
                                'Keine Spaltenzuordnung für diese Card.'
                              )}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p>Keine Card-zu-Spalten-Zuordnungen vorhanden.</p>
                      )}
                    </section>

                    <section className="qa-block">
                      <p className="qa-question">User-Ideen: Eigene Spalten (Diagramm)</p>
                      {renderCountBars(
                        overview.card_sort?.user_idea?.custom_columns_by_name || [],
                        (row) => row.column,
                        'Keine benutzerdefinierten Spalten vorhanden.'
                      )}
                    </section>

                    <section className="qa-block">
                      <p className="qa-question">User-Ideen: Eigene Cards (Top)</p>
                      {renderCountBars(
                        (overview.card_sort?.user_idea?.custom_cards_by_label || []).slice(0, 20),
                        (row) => row.label,
                        'Keine benutzerdefinierten Karten vorhanden.'
                      )}
                    </section>

                    <section className="qa-block modules-data-grid-full">
                      <p className="qa-question">User-Ideen: Eigene Cards je Spalte</p>
                      {renderPieChart(
                        overview.card_sort?.user_idea?.custom_cards_by_column || [],
                        (row) => row.column,
                        'Keine benutzerdefinierten Karten-Spaltenzuordnungen vorhanden.'
                      )}
                    </section>
                  </div>
                </div>
              )}

              {activeModuleTab === 'image_rating' && (
                <div>
                  {overview.image_rating?.length > 0 ? (
                    overview.image_rating.map((i) => (
                      <div key={i._id} className="list-row">
                        <span>{String(i._id)}</span>
                        <small>avg: {Number(i.avg || 0).toFixed(2)} • n: {i.n}</small>
                      </div>
                    ))
                  ) : (
                    <p>Keine Bildauswertungs-Daten vorhanden.</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardPanel>
      )}

      {portraits && (
        <CardPanel title="User Portraits und Profil-Daten Auswertung">
          <div className="analytics-collapse-header">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setProfileInsightsOpen((v) => !v)}
            >
              {profileInsightsOpen ? 'Zuklappen' : 'Aufklappen'}
            </button>
          </div>
          {profileInsightsOpen && (
            <>
              <div className="analytics-toolbar">
                <p className="hint">Profile in dieser Studie: <strong>{portraits.total_profiles || 0}</strong></p>
                <div className="analytics-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:4000/analytics/study/${selectedStudy}/user-portraits/export?format=pdf${portraitExportQuery ? `&${portraitExportQuery}` : ''}`,
                        '_blank'
                      )
                    }
                  >
                    Portrait PDF Export
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:4000/analytics/study/${selectedStudy}/user-portraits/export?format=json${portraitExportQuery ? `&${portraitExportQuery}` : ''}`,
                        '_blank'
                      )
                    }
                  >
                    Portrait JSON Export
                  </button>
                </div>
              </div>
              {filteredPortraitItems.length === 0 && <p>Keine Profildaten für den gewählten Filter.</p>}
              <div className="portrait-grid">
                {filteredPortraitItems.map((u) => (
                  <article key={`${u.user_id || u.username}`} className="portrait-card">
                    <h4>{u.username}</h4>
                    <small>Alter: {u.age_range || '-'}</small>
                    <small>Rolle: {roleLabel(u.role_category, u.role_custom)}</small>
                    <div className="tag-wrap">
                      {(u.key_points || []).map((point) => (
                        <span key={point} className="tag-chip">{point}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              <div className="profile-agg-grid">
                <div>
                  <h4>Alter (Verteilung)</h4>
                  {renderDistributionBars(filteredAggregates.age_ranges || [], (key) => key)}
                </div>
                <div>
                  <h4>Rollen (Verteilung)</h4>
                  {renderDistributionBars(filteredAggregates.roles || [], (key) => roleLabel(key, ''))}
                </div>
                <div>
                  <h4>Wichtige Wörter (Top)</h4>
                  {renderDistributionBars(filteredAggregates.key_points || [], (key) => key)}
                </div>
              </div>
            </>
          )}
        </CardPanel>
      )}
    </div>
  );
}
