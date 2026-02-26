import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { analyticsOverview, flattenExport } from '../services/analytics-service.js';
import { toCsv } from '../utils/csv.js';
import { UserStudyProfile } from '../models/UserStudyProfile.js';
import { Study } from '../models/Study.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function collectFilters(query = {}) {
  return {
    studyId: query.studyId,
    userId: query.userId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    age: query.age,
    role: query.role,
    keyword: query.keyword,
    testGroup: query.testGroup,
    ageGroup: query.ageGroup,
    interests: query.interests,
    needs: query.needs,
  };
}

function roleKey(roleCategory, roleCustom) {
  if (roleCategory === 'other') return `other:${roleCustom || 'ohne Angabe'}`;
  return roleCategory || '';
}

function toSortedRows(obj) {
  return Object.entries(obj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

function escapePdfText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text, maxLen = 105) {
  const raw = String(text || '');
  if (raw.length <= maxLen) return [raw];
  const words = raw.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (`${current} ${word}`.length <= maxLen) {
      current = `${current} ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function toPdfEntries(report) {
  const entries = [];
  const push = (text, opts = {}) => entries.push({ text, ...opts });
  const spacer = (size = 8) => entries.push({ spacer: size });

  push('Anlage: User Portraits und Profil-Daten Auswertung', { bold: true, size: 16 });
  push('Projektbericht Kurs: DLBMIUID02 - User Interface Design', { size: 12 });
  spacer(10);
  push(`Studie: ${report.studyName || '-'}`, { bold: true, size: 11 });
  push(`Erstellt am: ${report.generatedAt}`, { size: 10 });
  push(`Filter: Alter = ${report.filters.age || 'Alle'} | Rolle = ${report.filters.role || 'Alle'} | Wichtiges Wort = ${report.filters.keyword || 'Alle'}`, { size: 10 });
  push(`Profil-Datensaetze (gefiltert): ${report.totalFiltered} von ${report.totalAll}`, { size: 10 });
  spacer(12);

  push('1. User Portraits', { bold: true, size: 13 });
  push('Beschreibung: Einzelansicht der Teilnehmenden mit Alter, Rolle und wichtigsten Wörtern.', { size: 10 });
  spacer(6);
  if (!report.items.length) {
    push('Keine Profile für den gewählten Filter vorhanden.', { size: 10 });
  } else {
    report.items.forEach((item, idx) => {
      push(`${idx + 1}. Nutzer: ${item.username}`, { bold: true, size: 11 });
      push(`Alter: ${item.age_range || '-'}`, { size: 10, indent: 16 });
      push(`Rolle: ${roleLabel(item.role_category, item.role_custom)}`, { size: 10, indent: 16 });
      push(`Wichtige Wörter: ${(item.key_points || []).join(', ') || '-'}`, { size: 10, indent: 16, wrap: true });
      push(`Erfasst am: ${item.completed_at ? new Date(item.completed_at).toLocaleString('de-DE') : '-'}`, { size: 10, indent: 16 });
      spacer(4);
    });
  }

  spacer(8);
  push('2. Profil-Daten Auswertung', { bold: true, size: 13 });
  push('Beschreibung: Häufigkeitsverteilungen für Alter, Rollen und wichtigste Wörter.', { size: 10 });
  spacer(6);

  push('2.1 Altersverteilung', { bold: true, size: 11 });
  if (!report.aggregates.age_ranges.length) {
    push('Keine Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    report.aggregates.age_ranges.forEach((row) => push(`- ${row.key}: ${row.count}`, { size: 10, indent: 16 }));
  }
  spacer(4);

  push('2.2 Rollenverteilung', { bold: true, size: 11 });
  if (!report.aggregates.roles.length) {
    push('Keine Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    report.aggregates.roles.forEach((row) => push(`- ${roleLabel(row.key, '')}: ${row.count}`, { size: 10, indent: 16, wrap: true }));
  }
  spacer(4);

  push('2.3 Wichtigste Wörter (Top)', { bold: true, size: 11 });
  if (!report.aggregates.key_points.length) {
    push('Keine Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    report.aggregates.key_points.forEach((row) => push(`- ${row.key}: ${row.count}`, { size: 10, indent: 16, wrap: true }));
  }

  return entries;
}

function toModulePdfEntries(report) {
  const entries = [];
  const push = (text, opts = {}) => entries.push({ text, ...opts });
  const spacer = (size = 8) => entries.push({ spacer: size });

  push('Anlage: Studienmodule Auswertung', { bold: true, size: 16 });
  push('Projektbericht Kurs: DLBMIUID02 - User Interface Design', { size: 12 });
  spacer(10);
  push(`Studie: ${report.studyName || '-'}`, { bold: true, size: 11 });
  push(`Erstellt am: ${report.generatedAt}`, { size: 10 });
  push(
    `Filter: Alter = ${report.filters.age || 'Alle'} | Rolle = ${report.filters.role || 'Alle'} | Wichtiges Wort = ${report.filters.keyword || 'Alle'}`,
    { size: 10 }
  );
  spacer(12);

  push('1. KPI', { bold: true, size: 13 });
  push(`Teilnahmen gesamt: ${report.overview.sessions_total ?? 0}`, { size: 10, indent: 16 });
  push(`Abgeschlossen: ${report.overview.sessions_done ?? 0}`, { size: 10, indent: 16 });
  push(`Abschlussrate: ${report.overview.completion_rate ?? 0}%`, { size: 10, indent: 16 });
  spacer(10);

  push('2. Interview', { bold: true, size: 13 });
  if (!report.overview.questionnaire?.length) {
    push('Keine Interview-Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    report.overview.questionnaire.forEach((q, qIdx) => {
      push(`${qIdx + 1}. Frage: ${q.question_text || String(q._id)}`, { bold: true, size: 11 });
      push(`Antworten gesamt: ${q.n ?? 0}`, { size: 10, indent: 16 });
      if (q.answers?.length) {
        q.answers.forEach((a, idx) => {
          push(`- Antwort ${idx + 1}: ${a}`, { size: 10, indent: 20, wrap: true });
        });
      } else {
        push('- Keine Antworten vorhanden.', { size: 10, indent: 20 });
      }
      spacer(4);
    });
  }
  spacer(8);

  push('3. Card Sorting', { bold: true, size: 13 });
  push(`Submissions: ${report.overview.card_sort_submissions ?? 0}`, { size: 10, indent: 16 });
  spacer(8);

  push('4. Bildauswertung', { bold: true, size: 13 });
  if (!report.overview.image_rating?.length) {
    push('Keine Bildauswertungs-Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    report.overview.image_rating.forEach((row) => {
      push(
        `- Bild ${String(row._id)} | Durchschnitt: ${Number(row.avg || 0).toFixed(2)} | n: ${row.n}`,
        { size: 10, indent: 16, wrap: true }
      );
    });
  }
  return entries;
}

function paginateEntries(entries) {
  const topY = 800;
  const bottomY = 58;
  const leftX = 46;
  const pages = [[]];
  let y = topY;

  const pushPage = () => {
    pages.push([]);
    y = topY;
  };

  for (const entry of entries) {
    if (entry.spacer) {
      y -= entry.spacer;
      if (y < bottomY) pushPage();
      continue;
    }

    const fontSize = entry.size || 11;
    const lineHeight = Math.max(12, Math.round(fontSize * 1.35));
    const indent = entry.indent || 0;
    const wrapLimit = entry.wrap ? Math.max(45, 110 - Math.round(indent / 2)) : 500;
    const lines = wrapLine(entry.text, wrapLimit);

    for (const line of lines) {
      if (y - lineHeight < bottomY) pushPage();
      pages[pages.length - 1].push({
        text: line,
        x: leftX + indent,
        y,
        size: fontSize,
        bold: !!entry.bold,
      });
      y -= lineHeight;
    }
  }

  return pages;
}

function createStructuredPdf(entries) {
  const pages = paginateEntries(entries);
  const pageCount = pages.length;
  const pageObjStart = 3;
  const fontObjNum = pageObjStart + pageCount * 2;
  const boldFontObjNum = fontObjNum + 1;
  const objectMap = new Map();

  objectMap.set(1, '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  const kidRefs = [];

  for (let idx = 0; idx < pageCount; idx += 1) {
    const pageObjNum = pageObjStart + idx * 2;
    const contentObjNum = pageObjNum + 1;
    kidRefs.push(`${pageObjNum} 0 R`);

    const textCommands = ['BT'];
    for (const row of pages[idx]) {
      textCommands.push(`/${row.bold ? 'F2' : 'F1'} ${row.size} Tf`);
      textCommands.push(`1 0 0 1 ${row.x} ${row.y} Tm (${escapePdfText(row.text)}) Tj`);
    }
    textCommands.push('/F1 9 Tf');
    textCommands.push(`1 0 0 1 46 28 Tm (DLBMIUID02 - User Interface Design | Seite ${idx + 1} von ${pageCount}) Tj`);
    textCommands.push('ET');
    const stream = textCommands.join('\n');

    objectMap.set(
      pageObjNum,
      `${pageObjNum} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjNum} 0 R /F2 ${boldFontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >> endobj`
    );
    objectMap.set(
      contentObjNum,
      `${contentObjNum} 0 obj << /Length ${Buffer.byteLength(stream, 'latin1')} >> stream\n${stream}\nendstream endobj`
    );
  }

  objectMap.set(2, `2 0 obj << /Type /Pages /Kids [${kidRefs.join(' ')}] /Count ${pageCount} >> endobj`);
  objectMap.set(fontObjNum, `${fontObjNum} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`);
  objectMap.set(boldFontObjNum, `${boldFontObjNum} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >> endobj`);

  const maxObjNum = Math.max(...objectMap.keys());
  let offset = 9;
  const offsets = new Array(maxObjNum + 1).fill(0);
  let body = '';
  for (let i = 1; i <= maxObjNum; i += 1) {
    const obj = objectMap.get(i);
    if (!obj) continue;
    const out = `${obj}\n`;
    offsets[i] = offset;
    offset += Buffer.byteLength(out, 'latin1');
    body += out;
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${maxObjNum + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maxObjNum; i += 1) {
    if (offsets[i] === 0) {
      xref += '0000000000 65535 f \n';
    } else {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
  }
  const trailer = `trailer << /Size ${maxObjNum + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(`%PDF-1.4\n${body}${xref}${trailer}`, 'latin1');
}

function roleLabel(roleCategory, roleCustom) {
  if (String(roleCategory || '').startsWith('other:')) {
    const custom = String(roleCategory).slice('other:'.length);
    return custom ? `Eigene Rolle: ${custom}` : 'Eigene Rolle';
  }
  if (roleCategory === 'schueler_azubi_student') return 'Schüler/Azubi/Student';
  if (roleCategory === 'angestellter_fachabteilung') return 'Angestellter aus Fachabteilung';
  if (roleCategory === 'leitende_position') return 'Leitende Position';
  if (roleCategory === 'other') return roleCustom ? `Eigene Rolle: ${roleCustom}` : 'Eigene Rolle';
  return roleCategory || '-';
}

async function loadPortraitInsights(studyId, filters = {}) {
  const study = await Study.findById(studyId, { name: 1 });
  const profiles = await UserStudyProfile.find({ study_id: studyId })
    .populate('user_id', 'username')
    .sort({ completed_at: -1 });

  const filteredProfiles = profiles.filter((p) => {
    const ageRange = p.age_range || '';
    const role = roleKey(p.role_category || '', p.role_custom || '');
    const points = Array.isArray(p.key_points) ? p.key_points : [];
    const byAge = filters.age ? ageRange === filters.age : true;
    const byRole = filters.role ? role === filters.role : true;
    const byKeyword = filters.keyword ? points.includes(filters.keyword) : true;
    return byAge && byRole && byKeyword;
  });

  const ageRangeDist = {};
  const roleDist = {};
  const keywordDist = {};

  const items = filteredProfiles.map((p) => {
    const ageRange = p.age_range || '';
    const roleCategory = p.role_category || '';
    const roleCustom = p.role_custom || '';
    const keyPoints = Array.isArray(p.key_points) ? p.key_points : [];

    if (ageRange) ageRangeDist[ageRange] = (ageRangeDist[ageRange] || 0) + 1;
    const role = roleKey(roleCategory, roleCustom);
    if (role) roleDist[role] = (roleDist[role] || 0) + 1;
    for (const point of keyPoints) {
      keywordDist[point] = (keywordDist[point] || 0) + 1;
    }

    return {
      user_id: p.user_id?._id || null,
      username: p.user_id?.username || 'unbekannt',
      age_range: ageRange,
      role_category: roleCategory,
      role_custom: roleCustom,
      key_points: keyPoints,
      completed_at: p.completed_at,
    };
  });

  return {
    study_id: studyId,
    study_name: study?.name || '',
    total_profiles: items.length,
    total_profiles_unfiltered: profiles.length,
    filters_applied: filters,
    items,
    aggregates: {
      age_ranges: toSortedRows(ageRangeDist),
      roles: toSortedRows(roleDist),
      key_points: toSortedRows(keywordDist),
    },
  };
}

router.get('/overview', async (req, res, next) => {
  try {
    const filters = collectFilters(req.query);
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/group/:groupId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, testGroup: req.params.groupId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, studyId: req.params.studyId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/charts', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, studyId: req.params.studyId });
    const data = await analyticsOverview(filters);
    res.json({ chart_type: 'bar', labels: ['sessions_total', 'sessions_done'], series: [data.sessions_total, data.sessions_done], filters_applied: filters });
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/modules/export', async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const filters = collectFilters({
      ...req.query,
      studyId: req.params.studyId,
    });
    const overview = await analyticsOverview(filters);
    const study = await Study.findById(req.params.studyId, { name: 1 });

    if (format === 'pdf') {
      const pdf = createStructuredPdf(
        toModulePdfEntries({
          studyName: study?.name || '',
          generatedAt: new Date().toLocaleString('de-DE'),
          filters,
          overview,
        })
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="studienmodule-report.pdf"');
      return res.status(200).send(pdf);
    }

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="studienmodule-report.json"');
      return res.json({
        study_id: req.params.studyId,
        study_name: study?.name || '',
        generated_at: new Date().toISOString(),
        filters_applied: filters,
        overview,
      });
    }

    return res.status(400).json({ error: 'unsupported format, use json or pdf' });
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/user-portraits', async (req, res, next) => {
  try {
    const data = await loadPortraitInsights(req.params.studyId, {
      age: req.query.age ? String(req.query.age) : '',
      role: req.query.role ? String(req.query.role) : '',
      keyword: req.query.keyword ? String(req.query.keyword) : '',
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/study/:studyId/user-portraits/export', async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const filters = {
      age: req.query.age ? String(req.query.age) : '',
      role: req.query.role ? String(req.query.role) : '',
      keyword: req.query.keyword ? String(req.query.keyword) : '',
    };
    const data = await loadPortraitInsights(req.params.studyId, filters);

    if (format === 'pdf') {
      const report = {
        studyName: data.study_name,
        generatedAt: new Date().toLocaleString('de-DE'),
        filters,
        totalFiltered: data.total_profiles,
        totalAll: data.total_profiles_unfiltered,
        items: data.items,
        aggregates: data.aggregates,
      };
      const pdf = createStructuredPdf(toPdfEntries(report));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="user-portraits-report.pdf"');
      return res.status(200).send(pdf);
    }

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="user-portraits-report.json"');
      return res.json(data);
    }

    return res.status(400).json({ error: 'unsupported format, use json or pdf' });
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, userId: req.params.userId });
    const data = await analyticsOverview(filters);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/user/:userId/charts', async (req, res, next) => {
  try {
    const filters = collectFilters({ ...req.query, userId: req.params.userId });
    const data = await analyticsOverview(filters);
    res.json({ chart_type: 'line', labels: ['sessions_total', 'sessions_done'], series: [data.sessions_total, data.sessions_done], filters_applied: filters });
  } catch (err) {
    next(err);
  }
});

router.get('/compare/users', async (req, res) => {
  const userIds = String(req.query.userIds || '').split(',').filter(Boolean);
  res.json({ userIds, message: 'Comparison endpoint scaffold ready' });
});

router.get('/compare/studies', async (req, res) => {
  const studyIds = String(req.query.studyIds || '').split(',').filter(Boolean);
  res.json({ studyIds, message: 'Comparison endpoint scaffold ready' });
});

router.get('/export', async (req, res, next) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    const filters = collectFilters(req.query);
    const data = await analyticsOverview(filters);
    const rows = flattenExport(data, filters);

    if (format === 'csv') {
      const csv = toCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      return res.status(200).send(csv);
    }

    return res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/export/chart', async (req, res) => {
  res.status(501).json({ message: 'PNG chart export endpoint scaffolded; renderer integration pending' });
});

export default router;
