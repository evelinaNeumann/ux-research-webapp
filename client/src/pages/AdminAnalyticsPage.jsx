import { useEffect, useMemo, useRef, useState } from 'react';
import { CardPanel } from '../components/CardPanel';
import { studyApi } from '../api/studies';
import { analyticsApi } from '../api/analytics';
import './AdminAnalyticsPage.css';

function defaultModulesForStudy(study) {
  const type = String(study?.type || 'mixed');
  if (type === 'questionnaire') return ['questionnaire'];
  if (type === 'card_sort') return ['card_sort'];
  if (type === 'image_rating') return ['image_rating'];
  if (type === 'task_work') return [];
  return ['questionnaire', 'card_sort', 'image_rating'];
}

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
  const [reportText, setReportText] = useState('');
  const [reportFontFamily, setReportFontFamily] = useState('Arial');
  const [reportFontSize, setReportFontSize] = useState(14);
  const [reportTextColor, setReportTextColor] = useState('#111827');
  const [reportBold, setReportBold] = useState(false);
  const [reportItalic, setReportItalic] = useState(false);
  const [reportIncludePortraits, setReportIncludePortraits] = useState(true);
  const [reportIncludeCharts, setReportIncludeCharts] = useState({
    interview: true,
    card_sort: true,
    image_rating: true,
    task_work: true,
  });
  const reportPreviewRef = useRef(null);

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
  const selectedStudyData = useMemo(
    () => studies.find((s) => s._id === selectedStudy) || null,
    [studies, selectedStudy]
  );
  const configuredModules = useMemo(
    () => (selectedStudyData?.module_order?.length ? selectedStudyData.module_order : defaultModulesForStudy(selectedStudyData)),
    [selectedStudyData]
  );
  const hasInterviewTab = configuredModules.includes('questionnaire') && (overview?.questionnaire_questions_total || 0) > 0;
  const hasCardSortTab =
    configuredModules.includes('card_sort') &&
    ((overview?.card_sort?.configured_cards_total || 0) > 0 || (overview?.card_sort?.configured_columns_total || 0) > 0);
  const hasImageTab = configuredModules.includes('image_rating') && (overview?.image_assets_total || 0) > 0;
  const hasTaskTab = (overview?.task_work?.tasks?.length || 0) > 0 || selectedStudyData?.type === 'task_work';
  const visibleTabs = useMemo(() => {
    const tabs = [];
    if (hasInterviewTab) tabs.push('questionnaire');
    if (hasCardSortTab) tabs.push('card_sort');
    if (hasImageTab) tabs.push('image_rating');
    if (hasTaskTab) tabs.push('task_work');
    return tabs;
  }, [hasInterviewTab, hasCardSortTab, hasImageTab, hasTaskTab]);

  useEffect(() => {
    if (!visibleTabs.length) {
      setActiveModuleTab('');
      return;
    }
    if (!visibleTabs.includes(activeModuleTab)) {
      setActiveModuleTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeModuleTab]);

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
              <span className="pie-label">{`${s.label} `}</span>
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

  const buildDraftReportText = (sourceOverview, studyName) => {
    if (!sourceOverview) return '';
    const lines = [];
    lines.push('Projektbericht Kurs: DLBMIUID02 - User Interface Design');
    lines.push(`Studie: ${studyName || '-'}`);
    lines.push(`Teilnahmen: ${sourceOverview.sessions_total ?? 0}`);
    lines.push(`Abgeschlossen: ${sourceOverview.sessions_done ?? 0}`);
    lines.push(`Abschlussrate: ${sourceOverview.completion_rate ?? 0}%`);
    lines.push('');
    lines.push('1. Interview');
    if (!sourceOverview.questionnaire?.length) {
      lines.push('Keine Interview-Daten vorhanden.');
    } else {
      sourceOverview.questionnaire.forEach((q, idx) => {
        lines.push(`${idx + 1}. ${q.question_text || q._id} (n=${q.n ?? 0})`);
      });
    }
    lines.push('');
    lines.push('2. Card Sorting');
    lines.push(`Submissions gesamt: ${sourceOverview.card_sort_submissions ?? 0}`);
    lines.push('');
    lines.push('3. Bildauswertung');
    if (!sourceOverview.image_rating?.length) {
      lines.push('Keine Bildauswertungs-Daten vorhanden.');
    } else {
      sourceOverview.image_rating.forEach((row) => {
        lines.push(`Bild ${String(row._id)}: Ø ${Number(row.avg || 0).toFixed(2)} (n=${row.n})`);
      });
    }
    lines.push('');
    lines.push('4. Aufgabenbearbeitung');
    if (!(sourceOverview.task_work?.tasks || []).length) {
      lines.push('Keine Aufgaben-Daten vorhanden.');
    } else {
      (sourceOverview.task_work?.tasks || []).forEach((task, idx) => {
        lines.push(
          `${idx + 1}. ${task.title}: gesamt ${task.total ?? 0}, korrekt ${task.correct ?? 0}, falsch geklickt ${task.incorrect_click ?? 0}, Zeit abgelaufen ${task.timed_out ?? 0}`
        );
      });
    }
    return lines.join('\n');
  };

  useEffect(() => {
    if (!overview) return;
    setReportText(buildDraftReportText(overview, selectedStudyName));
  }, [overview, selectedStudyName]);

  const openReportPrintPreview = () => {
    if (!reportPreviewRef.current) return;
    const previewHtml = reportPreviewRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Report Vorschau</title>
          <style>
            body { font-family: ${reportFontFamily}, sans-serif; font-size: ${reportFontSize}px; color: ${reportTextColor}; margin: 24px; background: #f5f7fb; font-weight: ${reportBold ? '700' : '400'}; font-style: ${reportItalic ? 'italic' : 'normal'}; }
            .print-toolbar { position: sticky; top: 0; z-index: 10; background: #fff; padding: 10px 0 12px; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px; }
            .print-btn { border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; border-radius: 8px; padding: 8px 12px; font-size: 14px; cursor: pointer; }
            .report-preview-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; box-shadow: 0 8px 20px rgba(15,23,42,0.12); padding: 12mm; box-sizing: border-box; }
            .report-preview-content { display: grid; gap: 10px; }
            .report-line { margin: 0; white-space: pre-wrap; }
            .report-diagram-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .report-diagram-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; }
            .report-diagram-card-wide { grid-column: 1 / -1; }
            .pie-chart { width: 160px; height: 160px; border-radius: 50%; border: 1px solid #e5e7eb; margin: 0 auto; }
            .report-preview-content .pie-block { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; }
            .report-preview-content .pie-legend { order: 1; }
            .report-preview-content .pie-chart { order: 2; width: 92px; height: 92px; margin: 0; }
            .report-portrait-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(280px, 350px)); justify-content: start; }
            .profile-agg-grid { display: grid; gap: 10px; grid-template-columns: 1fr; }
            .dist-wrap { display: grid; gap: 6px; }
            .dist-row { display: grid; grid-template-columns: minmax(120px, 190px) 1fr auto; align-items: center; gap: 8px; }
            .dist-label { color: #334155; font-size: 12px; }
            .dist-value { font-size: 12px; color: #0f172a; }
            .bar-track { height: 10px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
            .bar-fill { height: 100%; background: #1d4ed8; }
            .portrait-card { border: 1px solid #e6ebf3; border-radius: 12px; padding: 8px; display: grid; gap: 4px; }
            .tag-wrap { display: flex; gap: 6px; flex-wrap: wrap; }
            .tag-chip { border: 1px solid #dbe7ff; border-radius: 999px; background: #eff6ff; color: #1e40af; padding: 2px 8px; font-size: 12px; }
            @media (max-width: 900px) { .report-preview-page { width: 100%; min-height: auto; padding: 16px; } .report-diagram-grid, .report-portrait-grid, .profile-agg-grid { grid-template-columns: 1fr; } }
            @media print { body { background: #fff; margin: 0; } .print-toolbar { display: none; } .report-preview-page { width: auto; min-height: auto; margin: 0; box-shadow: none; padding: 10mm; } }
          </style>
        </head>
        <body>
          <div class="print-toolbar">
            <button class="print-btn" onclick="window.print()">Report drucken</button>
          </div>
          <div class="report-preview-page">${previewHtml}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

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
              onClick={() => window.open(`http://localhost:4000/analytics/export?format=pdf&studyId=${selectedStudy}`, '_blank')}
            >
              PDF Export
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

      {overview && (
        <CardPanel title="PDF Report Vorschau und Editor">
          <div className="report-editor-grid">
            <label className="form-field">
              <span>Schriftart</span>
              <select value={reportFontFamily} onChange={(e) => setReportFontFamily(e.target.value)}>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
              </select>
            </label>
            <label className="form-field">
              <span>Schriftgröße</span>
              <input
                type="number"
                min="10"
                max="24"
                value={reportFontSize}
                onChange={(e) => setReportFontSize(Math.max(10, Math.min(24, Number(e.target.value) || 14)))}
              />
            </label>
            <label className="form-field">
              <span>Textfarbe</span>
              <input type="color" value={reportTextColor} onChange={(e) => setReportTextColor(e.target.value)} />
            </label>
            <label className="form-field report-inline-check">
              <span>Fett</span>
              <input type="checkbox" checked={reportBold} onChange={(e) => setReportBold(e.target.checked)} />
            </label>
            <label className="form-field report-inline-check">
              <span>Kursiv</span>
              <input type="checkbox" checked={reportItalic} onChange={(e) => setReportItalic(e.target.checked)} />
            </label>
            <div className="analytics-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setReportText(buildDraftReportText(overview, selectedStudyName))}
              >
                Text neu laden
              </button>
              <button type="button" className="primary-btn" onClick={openReportPrintPreview}>
                Vorschau/Drucken (PDF)
              </button>
            </div>
          </div>

          <div className="report-include-row">
            <label><input type="checkbox" checked={reportIncludePortraits} onChange={(e) => setReportIncludePortraits(e.target.checked)} /> User Portraits</label>
            <label><input type="checkbox" checked={reportIncludeCharts.interview} onChange={(e) => setReportIncludeCharts((p) => ({ ...p, interview: e.target.checked }))} /> Interview-Diagramme</label>
            <label><input type="checkbox" checked={reportIncludeCharts.card_sort} onChange={(e) => setReportIncludeCharts((p) => ({ ...p, card_sort: e.target.checked }))} /> Card-Sorting-Diagramme</label>
            <label><input type="checkbox" checked={reportIncludeCharts.image_rating} onChange={(e) => setReportIncludeCharts((p) => ({ ...p, image_rating: e.target.checked }))} /> Bild-Diagramme</label>
            <label><input type="checkbox" checked={reportIncludeCharts.task_work} onChange={(e) => setReportIncludeCharts((p) => ({ ...p, task_work: e.target.checked }))} /> Aufgaben-Diagramme</label>
          </div>

          <label className="form-field">
            <span>Report-Text (frei editierbar, Zeilen können gelöscht werden)</span>
            <textarea
              rows={14}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="report-textarea"
            />
          </label>

          <div className="report-preview-page">
            <div
              ref={reportPreviewRef}
              className="report-preview-content"
              style={{
                fontFamily: reportFontFamily,
                fontSize: `${reportFontSize}px`,
                color: reportTextColor,
                fontWeight: reportBold ? 700 : 400,
                fontStyle: reportItalic ? 'italic' : 'normal',
              }}
            >
              {reportText.split('\n').map((line, idx) => (
                <p key={`report-line-${idx}`} className="report-line">{line || ' '}</p>
              ))}

              {reportIncludePortraits && (
                <div className="report-diagram-card">
                  <p className="qa-question">User Portraits und Profil-Daten</p>
                  <p className="hint">Profile (gefiltert): {filteredProfileCount}</p>
                  {filteredPortraitItems.length > 0 ? (
                    <>
                      <div className="portrait-grid report-portrait-grid">
                        {filteredPortraitItems.map((u) => (
                          <article key={`report-portrait-${u.user_id || u.username}`} className="portrait-card">
                            <h4>{u.username}</h4>
                            <small>Alter: {u.age_range || '-'}</small>
                            <small>Rolle: {roleLabel(u.role_category, u.role_custom)}</small>
                            <div className="tag-wrap">
                              {(u.key_points || []).map((point) => (
                                <span key={`${u.username}-${point}`} className="tag-chip">{point}</span>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                      <div className="profile-agg-grid report-profile-agg-stack">
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
                  ) : (
                    <p>Keine Profildaten für den gewählten Filter.</p>
                  )}
                </div>
              )}

              <div className="report-diagram-grid">
              {reportIncludeCharts.interview && (
                <article className="report-diagram-card">
                  <p className="qa-question">Interview Antworten je Frage</p>
                  {renderCountBars(
                    (overview.questionnaire || []).map((q) => ({ label: q.question_text || String(q._id), count: q.n || 0 })),
                    (row) => row.label,
                    'Keine Interview-Daten vorhanden.'
                  )}
                </article>
              )}
              {reportIncludeCharts.card_sort && (
                <article className="report-diagram-card">
                  <p className="qa-question">Card Sorting: Zuordnungen je Spalte</p>
                  {renderPieChart(
                    overview.card_sort?.column_distribution || [],
                    (row) => row.column,
                    'Keine Card-Sorting-Daten vorhanden.'
                  )}
                </article>
              )}
              {reportIncludeCharts.image_rating && (
                <article className="report-diagram-card">
                  <p className="qa-question">Bildauswertung</p>
                  {renderCountBars(
                    (overview.image_rating || []).map((img) => ({ label: `Bild ${String(img._id)}`, count: Number((Number(img.avg || 0)).toFixed(2)) })),
                    (row) => row.label,
                    'Keine Bilddaten vorhanden.'
                  )}
                </article>
              )}
              {reportIncludeCharts.task_work && (
                <article className="report-diagram-card report-diagram-card-wide">
                  <p className="qa-question">Aufgaben: Task gesamt</p>
                  {(overview.task_work?.tasks || []).length ? (
                    (overview.task_work?.tasks || []).map((task) => (
                      <div key={`report-task-pie-${task.task_id}`} className="report-task-block">
                        <small>{task.title}</small>
                        {renderPieChart(
                          [
                            { label: 'Korrekt', count: Number(task.correct || 0) },
                            { label: 'Falsch geklickt', count: Number(task.incorrect_click || 0) },
                            { label: 'Zeit abgelaufen', count: Number(task.timed_out || 0) },
                          ],
                          (row) => row.label
                        )}
                        {(task.steps || []).length > 0 && (
                          <div className="report-step-grid">
                            {(task.steps || []).map((step) => (
                              <div key={`report-task-step-${task.task_id}-${step.step_index}`} className="report-step-card">
                                <small>
                                  Schritt {Number(step.step_index || 0) + 1}: {step.prompt || '-'}
                                </small>
                                {renderPieChart(
                                  [
                                    { label: 'Korrekt', count: Number(step.correct || 0) },
                                    { label: 'Falsch geklickt', count: Number(step.incorrect_click || 0) },
                                    { label: 'Zeit abgelaufen', count: Number(step.timed_out || 0) },
                                  ],
                                  (row) => row.label
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>Keine Aufgaben-Daten vorhanden.</p>
                  )}
                </article>
              )}
              </div>
            </div>
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
                  {hasInterviewTab && (
                    <button
                      type="button"
                      className={activeModuleTab === 'questionnaire' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setActiveModuleTab('questionnaire')}
                    >
                      Interview
                    </button>
                  )}
                  {hasCardSortTab && (
                    <button
                      type="button"
                      className={activeModuleTab === 'card_sort' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setActiveModuleTab('card_sort')}
                    >
                      Card Sorting
                    </button>
                  )}
                  {hasImageTab && (
                    <button
                      type="button"
                      className={activeModuleTab === 'image_rating' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setActiveModuleTab('image_rating')}
                    >
                      Bildauswertung
                    </button>
                  )}
                  {hasTaskTab && (
                    <button
                      type="button"
                      className={activeModuleTab === 'task_work' ? 'tab-btn active' : 'tab-btn'}
                      onClick={() => setActiveModuleTab('task_work')}
                    >
                      Aufgaben
                    </button>
                  )}
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

              {hasInterviewTab && activeModuleTab === 'questionnaire' && (
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

              {hasCardSortTab && activeModuleTab === 'card_sort' && (
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

              {hasImageTab && activeModuleTab === 'image_rating' && (
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

              {hasTaskTab && activeModuleTab === 'task_work' && (
                <div className="module-stack">
                  <div className="kpi-grid compact">
                    <article className="mini-kpi">
                      <span>Antworten gesamt</span>
                      <strong>{overview.task_work?.submissions_total ?? 0}</strong>
                    </article>
                    <article className="mini-kpi">
                      <span>Tasks</span>
                      <strong>{overview.task_work?.tasks?.length ?? 0}</strong>
                    </article>
                  </div>
                  {(overview.task_work?.tasks || []).length > 0 ? (
                    <div className="modules-data-grid">
                      {(overview.task_work?.tasks || []).map((task) => (
                        <section key={task.task_id} className="qa-block modules-data-grid-full">
                          <p className="qa-question">{task.title}</p>
                          <small>
                            Gesamt: {task.total ?? 0} • korrekt: {task.correct ?? 0} • falsch geklickt: {task.incorrect_click ?? 0} • Zeit abgelaufen: {task.timed_out ?? 0}
                          </small>
                          <div className="qa-answer-list">
                            <p className="qa-question">Kreisdiagramm: Gesamt korrekt/falsch</p>
                            <div className="pie-cards-grid">
                              <article className="qa-block qa-nested pie-card">
                                {renderPieChart(
                                  [
                                    { label: 'Korrekt', count: Number(task.correct || 0) },
                                    { label: 'Falsch', count: Number(task.incorrect || 0) },
                                  ],
                                  (row) => row.label,
                                  'Keine Task-Daten vorhanden.'
                                )}
                              </article>
                            </div>
                          </div>
                          <div className="qa-answer-list">
                            <div className="pie-cards-grid">
                              {(task.steps || []).map((step) => (
                                <article key={`${task.task_id}-${step.step_index}`} className="qa-block qa-nested pie-card">
                                <div className="list-row">
                                  <span>
                                    Schritt {Number(step.step_index || 0) + 1}: {step.prompt || '-'}
                                  </span>
                                  <small>
                                    n: {step.total ?? 0} • korrekt: {step.correct ?? 0} • falsch geklickt: {step.incorrect_click ?? 0} • Zeit abgelaufen: {step.timed_out ?? 0} • Quote: {step.correct_rate ?? 0}%
                                  </small>
                                </div>
                                {renderPieChart(
                                  [
                                    { label: 'Korrekt', count: Number(step.correct || 0) },
                                    { label: 'Falsch geklickt', count: Number(step.incorrect_click || 0) },
                                    { label: 'Zeit abgelaufen', count: Number(step.timed_out || 0) },
                                  ],
                                  (row) => row.label,
                                  'Keine Daten für diesen Schritt.'
                                )}
                                </article>
                              ))}
                            </div>
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p>Keine Aufgaben-Daten vorhanden.</p>
                  )}
                </div>
              )}
              {!visibleTabs.length && <p>Für diese Studie sind keine Studienmodule hinterlegt.</p>}
            </>
          )}
        </CardPanel>
      )}

    </div>
  );
}
