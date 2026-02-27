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
  const pushBars = (rows, labelMapper) => {
    const max = Math.max(...rows.map((r) => r.count), 1);
    const total = Math.max(report.totalFiltered || 0, 1);
    rows.forEach((row) =>
      entries.push({
        bar: {
          label: labelMapper(row),
          count: row.count,
          percent: Math.round((row.count / total) * 100),
          ratio: row.count / max,
        },
      })
    );
  };

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
    pushBars(report.aggregates.age_ranges, (row) => row.key);
  }
  spacer(4);

  push('2.2 Rollenverteilung', { bold: true, size: 11 });
  if (!report.aggregates.roles.length) {
    push('Keine Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    pushBars(report.aggregates.roles, (row) => roleLabel(row.key, ''));
  }
  spacer(4);

  push('2.3 Wichtigste Wörter (Top)', { bold: true, size: 11 });
  if (!report.aggregates.key_points.length) {
    push('Keine Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    pushBars(report.aggregates.key_points.slice(0, 12), (row) => row.key);
  }

  return entries;
}

function toModulePdfEntries(report) {
  const entries = [];
  const push = (text, opts = {}) => entries.push({ text, ...opts });
  const spacer = (size = 8) => entries.push({ spacer: size });
  const piePalette = ['#1d4ed8', '#f59e0b', '#16a34a', '#db2777', '#0ea5e9', '#7c3aed', '#ef4444', '#14b8a6'];
  const pushBars = (rows, labelMapper, totalOverride = null, maxItems = 12) => {
    const source = Array.isArray(rows) ? rows.slice(0, maxItems) : [];
    if (!source.length) {
      push('Keine Daten vorhanden.', { size: 10, indent: 16 });
      return;
    }
    const max = Math.max(...source.map((r) => Number(r.count || 0)), 1);
    const total =
      totalOverride !== null
        ? Math.max(Number(totalOverride) || 0, 1)
        : Math.max(source.reduce((sum, row) => sum + (Number(row.count) || 0), 0), 1);
    source.forEach((row) =>
      entries.push({
        bar: {
          label: labelMapper(row),
          count: Number(row.count || 0),
          percent: Math.round(((Number(row.count || 0) || 0) / total) * 100),
          ratio: (Number(row.count || 0) || 0) / max,
        },
      })
    );
  };
  const pushPie = (rows, labelMapper, totalOverride = null, maxItems = 8) => {
    const source = Array.isArray(rows) ? rows.slice(0, maxItems) : [];
    if (!source.length) {
      push('Keine Daten vorhanden.', { size: 10, indent: 16 });
      return;
    }
    const total =
      totalOverride !== null
        ? Math.max(Number(totalOverride) || 0, 1)
        : Math.max(source.reduce((sum, row) => sum + (Number(row.count) || 0), 0), 1);
    const segments = source.map((row, idx) => ({
      label: labelMapper(row),
      value: Number(row.count || 0),
      percent: Math.round(((Number(row.count || 0) || 0) / total) * 100),
      color: piePalette[idx % piePalette.length],
    }));
    entries.push({ pie: { segments } });
  };
  const imageRows = (report.overview.image_rating || [])
    .map((row) => ({
      label: `Bild ${String(row._id)}`,
      count: Number((Number(row.avg || 0)).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), 'de-DE'));

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
  spacer(4);
  pushBars(
    [
      { key: 'Teilnahmen gesamt', count: report.overview.sessions_total ?? 0 },
      { key: 'Abgeschlossen', count: report.overview.sessions_done ?? 0 },
    ],
    (row) => row.key
  );
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
  const interviewChartRows = (report.overview.questionnaire || [])
    .map((q) => ({ key: q.question_text || String(q._id), count: q.n || 0 }))
    .filter((row) => row.count > 0);
  spacer(4);
  push('2.1 Diagramm: Antworten je Interview-Frage', { bold: true, size: 11 });
  pushBars(interviewChartRows, (row) => row.key, null, 20);
  spacer(8);

  push('3. Card Sorting', { bold: true, size: 13 });
  push(`Submissions gesamt: ${report.overview.card_sort_submissions ?? 0}`, { size: 10, indent: 16 });
  push(`Aktuelle Session-Staende: ${report.overview.card_sort?.latest_session_submissions ?? 0}`, {
    size: 10,
    indent: 16,
  });
  spacer(4);

  push('3.1 Verteilung nach Spalten', { bold: true, size: 11 });
  pushPie(
    report.overview.card_sort?.column_distribution || [],
    (row) => row.column,
    report.overview.card_sort?.column_distribution?.reduce((sum, row) => sum + (Number(row.count) || 0), 0) || null,
    8
  );
  spacer(4);

  push('3.2 Kartenhaeufigkeit (Top)', { bold: true, size: 11 });
  pushPie(
    (report.overview.card_sort?.card_distribution || []).map((row) => ({
      key: row.card_label,
      count: row.count,
    })),
    (row) => row.key,
    report.overview.card_sort?.card_distribution?.reduce((sum, row) => sum + (Number(row.count) || 0), 0) || null,
    8
  );
  spacer(4);

  push('3.3 Diagramm: Spalte -> Cards (Top je Spalte)', { bold: true, size: 11 });
  const colCardRows = report.overview.card_sort?.column_card_distribution || [];
  if (!colCardRows.length) {
    push('Keine Spalten-/Kartenzuordnungen vorhanden.', { size: 10, indent: 16 });
  } else {
    colCardRows.slice(0, 10).forEach((col) => {
      push(`Spalte: ${col.column}`, { bold: true, size: 10, indent: 16, wrap: true });
      pushPie(
        (col.cards || []).slice(0, 8).map((card) => ({ key: card.card_label, count: card.count })),
        (row) => row.key,
        col.total || null,
        8
      );
      spacer(3);
    });
  }
  spacer(4);

  push('3.4 Diagramm: Card -> Spalten (Top je Card)', { bold: true, size: 11 });
  const cardColRows = report.overview.card_sort?.card_column_distribution || [];
  if (!cardColRows.length) {
    push('Keine Card-zu-Spalten-Zuordnungen vorhanden.', { size: 10, indent: 16 });
  } else {
    cardColRows.slice(0, 15).forEach((card) => {
      push(`Card: ${card.card_label}`, { bold: true, size: 10, indent: 16, wrap: true });
      pushPie(
        (card.columns || []).slice(0, 8).map((col) => ({ key: col.column, count: col.count })),
        (row) => row.key,
        card.total || null,
        8
      );
      spacer(3);
    });
  }
  spacer(4);

  push('3.5 User-Ideen Kategorie', { bold: true, size: 11 });
  push(`Benutzerdefinierte Spalten: ${report.overview.card_sort?.user_idea?.custom_columns_total ?? 0}`, {
    size: 10,
    indent: 16,
  });
  push(`Benutzerdefinierte Karten: ${report.overview.card_sort?.user_idea?.custom_cards_total ?? 0}`, {
    size: 10,
    indent: 16,
  });
  spacer(2);
  push('3.5.1 Diagramm: Eigene Spalten (Name)', { bold: true, size: 10 });
  pushPie(
    report.overview.card_sort?.user_idea?.custom_columns_by_name || [],
    (row) => row.column,
    report.overview.card_sort?.user_idea?.custom_columns_total ?? null,
    8
  );
  spacer(2);
  push('3.5.2 Diagramm: Eigene Cards (Top)', { bold: true, size: 10 });
  pushPie(
    report.overview.card_sort?.user_idea?.custom_cards_by_label || [],
    (row) => row.label,
    report.overview.card_sort?.user_idea?.custom_cards_total ?? null,
    8
  );
  spacer(2);
  push('3.5.3 Diagramm: Eigene Cards je Spalte', { bold: true, size: 10 });
  pushPie(
    report.overview.card_sort?.user_idea?.custom_cards_by_column || [],
    (row) => row.column,
    report.overview.card_sort?.user_idea?.custom_cards_total ?? null,
    8
  );
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
  spacer(4);
  push('4.1 Diagramm: Durchschnittsbewertung je Bild', { bold: true, size: 11 });
  pushBars(
    imageRows,
    (row) => row.label,
    null,
    20
  );
  spacer(8);

  push('5. Aufgabenbearbeitung', { bold: true, size: 13 });
  push(`Antworten gesamt (alle Schritte): ${report.overview.task_work?.submissions_total ?? 0}`, {
    size: 10,
    indent: 16,
  });
  const taskItems = report.overview.task_work?.tasks || [];
  if (!taskItems.length) {
    push('Keine Aufgaben-Daten vorhanden.', { size: 10, indent: 16 });
  } else {
    taskItems.forEach((task, taskIdx) => {
      push(`${taskIdx + 1}. Task: ${task.title}`, { bold: true, size: 11 });
      push(
        `Gesamt: ${task.total ?? 0} | korrekt: ${task.correct ?? 0} | falsch geklickt: ${task.incorrect_click ?? 0} | Zeit abgelaufen: ${task.timed_out ?? 0}`,
        { size: 10, indent: 16 }
      );
      (task.steps || []).forEach((step) => {
        push(
          `- Schritt ${Number(step.step_index || 0) + 1}: ${step.prompt || '-'} | n: ${step.total ?? 0} | korrekt: ${step.correct ?? 0} | falsch geklickt: ${step.incorrect_click ?? 0} | Zeit abgelaufen: ${step.timed_out ?? 0} | Quote: ${step.correct_rate ?? 0}%`,
          { size: 10, indent: 20, wrap: true }
        );
      });
      spacer(3);
    });
    push('5.1 Diagramm: Korrektquote je Aufgabenstellung', { bold: true, size: 11 });
    const taskRateRows = taskItems.flatMap((task) =>
      (task.steps || []).map((step) => ({
        key: `${task.title} - S${Number(step.step_index || 0) + 1}`,
        count: Number(step.correct_rate || 0),
      }))
    );
    pushBars(taskRateRows, (row) => row.key, 100, 20);
  }
  return entries;
}

function buildModulesCharts(overview = {}) {
  return {
    kpi: {
      chart_type: 'bar',
      labels: ['Teilnahmen gesamt', 'Abgeschlossen'],
      series: [overview.sessions_total ?? 0, overview.sessions_done ?? 0],
    },
    interview_answers_per_question: {
      chart_type: 'bar',
      labels: (overview.questionnaire || []).map((q) => q.question_text || String(q._id)),
      series: (overview.questionnaire || []).map((q) => q.n || 0),
    },
    card_sort_columns: {
      chart_type: 'bar',
      labels: (overview.card_sort?.column_distribution || []).map((row) => row.column),
      series: (overview.card_sort?.column_distribution || []).map((row) => row.count || 0),
    },
    card_sort_cards_top: {
      chart_type: 'bar',
      labels: (overview.card_sort?.card_distribution || []).slice(0, 20).map((row) => row.card_label),
      series: (overview.card_sort?.card_distribution || []).slice(0, 20).map((row) => row.count || 0),
    },
    card_sort_card_to_columns: {
      chart_type: 'grouped_bar',
      series: (overview.card_sort?.card_column_distribution || []).slice(0, 20).map((card) => ({
        key: card.card_label,
        labels: (card.columns || []).map((col) => col.column),
        values: (card.columns || []).map((col) => col.count || 0),
      })),
    },
    user_idea_columns_by_name: {
      chart_type: 'bar',
      labels: (overview.card_sort?.user_idea?.custom_columns_by_name || []).map((row) => row.column),
      series: (overview.card_sort?.user_idea?.custom_columns_by_name || []).map((row) => row.count || 0),
    },
    user_idea_cards_by_label_top: {
      chart_type: 'bar',
      labels: (overview.card_sort?.user_idea?.custom_cards_by_label || []).slice(0, 20).map((row) => row.label),
      series: (overview.card_sort?.user_idea?.custom_cards_by_label || []).slice(0, 20).map((row) => row.count || 0),
    },
    image_rating_average: {
      chart_type: 'bar',
      labels: (overview.image_rating || []).map((row) => `Bild ${String(row._id)}`),
      series: (overview.image_rating || []).map((row) => Number((Number(row.avg || 0)).toFixed(2))),
    },
    task_work_correct_rate: {
      chart_type: 'bar',
      labels: (overview.task_work?.tasks || []).flatMap((task) =>
        (task.steps || []).map((step) => `${task.title} - S${Number(step.step_index || 0) + 1}`)
      ),
      series: (overview.task_work?.tasks || []).flatMap((task) =>
        (task.steps || []).map((step) => Number(step.correct_rate || 0))
      ),
    },
  };
}

function hexToRgbNorm(hex) {
  const raw = String(hex || '').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const valid = full.length === 6 ? full : '1d4ed8';
  const r = parseInt(valid.slice(0, 2), 16) / 255;
  const g = parseInt(valid.slice(2, 4), 16) / 255;
  const b = parseInt(valid.slice(4, 6), 16) / 255;
  return [Number(r.toFixed(4)), Number(g.toFixed(4)), Number(b.toFixed(4))];
}

function buildPieSlicePath(cx, cy, radius, startAngle, endAngle) {
  const sweep = Math.max(0.001, endAngle - startAngle);
  const steps = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 40));
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = startAngle + ((endAngle - startAngle) * i) / steps;
    const x = cx + Math.cos(t) * radius;
    const y = cy + Math.sin(t) * radius;
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${cx.toFixed(2)} ${cy.toFixed(2)} m ${points.join(' l ')} l h`;
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

    if (entry.bar) {
      const rowHeight = 18;
      if (y - rowHeight < bottomY) pushPage();
      pages[pages.length - 1].push({
        type: 'bar',
        x: leftX + 16,
        y,
        label: entry.bar.label,
        count: entry.bar.count,
        percent: entry.bar.percent,
        ratio: entry.bar.ratio,
      });
      y -= rowHeight;
      continue;
    }

    if (entry.pie) {
      const segCount = Array.isArray(entry.pie.segments) ? entry.pie.segments.length : 0;
      const rowHeight = Math.max(120, 34 + segCount * 14);
      if (y - rowHeight < bottomY) pushPage();
      pages[pages.length - 1].push({
        type: 'pie',
        x: leftX + 16,
        y,
        height: rowHeight,
        segments: entry.pie.segments || [],
      });
      y -= rowHeight;
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
        type: 'text',
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

    const textCommands = [];
    for (const row of pages[idx]) {
      if (row.type === 'bar') {
        const barX = row.x + 170;
        const barW = 220;
        const barH = 10;
        const fillW = Math.max(1, Math.round(barW * Math.max(0, Math.min(1, row.ratio || 0))));
        textCommands.push('BT');
        textCommands.push('/F1 10 Tf');
        textCommands.push(`1 0 0 1 ${row.x} ${row.y} Tm (${escapePdfText(String(row.label))}) Tj`);
        textCommands.push(`1 0 0 1 ${barX + barW + 10} ${row.y} Tm (${escapePdfText(`${row.count} (${row.percent}%)`)}) Tj`);
        textCommands.push('ET');
        textCommands.push('0.91 0.93 0.97 rg');
        textCommands.push(`${barX} ${row.y - 8} ${barW} ${barH} re f`);
        textCommands.push('0.13 0.35 0.88 rg');
        textCommands.push(`${barX} ${row.y - 8} ${fillW} ${barH} re f`);
      } else if (row.type === 'pie') {
        const segments = Array.isArray(row.segments) ? row.segments : [];
        if (!segments.length) continue;
        const total = Math.max(segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0), 1);
        const cx = row.x + 60;
        const cy = row.y - 42;
        const radius = 28;
        let angle = -Math.PI / 2;

        segments.forEach((seg) => {
          const value = Number(seg.value || 0);
          if (value <= 0) return;
          const frac = value / total;
          const next = angle + frac * Math.PI * 2;
          const [r, g, b] = hexToRgbNorm(seg.color);
          textCommands.push(`${r} ${g} ${b} rg`);
          textCommands.push(`${buildPieSlicePath(cx, cy, radius, angle, next)} f`);
          angle = next;
        });

        let legendY = row.y - 10;
        const legendX = row.x + 110;
        segments.forEach((seg) => {
          const [r, g, b] = hexToRgbNorm(seg.color);
          textCommands.push(`${r} ${g} ${b} rg`);
          textCommands.push(`${legendX} ${legendY - 8} 8 8 re f`);
          textCommands.push('BT');
          textCommands.push('/F1 9 Tf');
          textCommands.push(
            `1 0 0 1 ${legendX + 13} ${legendY} Tm (${escapePdfText(`${seg.label}: ${seg.value} (${seg.percent}%)`)}) Tj`
          );
          textCommands.push('ET');
          legendY -= 12;
        });
      } else {
        textCommands.push('BT');
        textCommands.push(`/${row.bold ? 'F2' : 'F1'} ${row.size} Tf`);
        textCommands.push(`1 0 0 1 ${row.x} ${row.y} Tm (${escapePdfText(row.text)}) Tj`);
        textCommands.push('ET');
      }
    }
    textCommands.push('BT');
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
    const charts = buildModulesCharts(overview);
    const study = await Study.findById(req.params.studyId, { name: 1 });

    if (format === 'pdf') {
      const pdf = createStructuredPdf(
        toModulePdfEntries({
          studyName: study?.name || '',
          generatedAt: new Date().toLocaleString('de-DE'),
          filters,
          overview,
          charts,
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
        charts,
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
