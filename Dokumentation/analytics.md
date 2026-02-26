
# analytics.md
# Analytics & Aggregation Logic

## 1. Likert-Skalen Auswertung
- Durchschnitt (avg)
- Standardabweichung
- Gruppenvergleich

MongoDB Aggregation Beispiel:
$group: {
  _id: "$question_id",
  avgRating: { $avg: "$response" }
}

---

## 2. Häufigkeitsanalyse
$group: {
  _id: "$response",
  count: { $sum: 1 }
}

---

## 3. Gruppenfilter
$match: {
  test_group_id: "groupId"
}

---

## 4. Card Sorting Aggregation
- Häufigkeit gemeinsamer Kartenplatzierung
- Erstellung einer Ähnlichkeitsmatrix

---

## 5. Export
- CSV für Projektbericht
- JSON für Weiterverarbeitung
- PNG für Diagramme im Projektbericht

---

## 6. User View Aggregation (pro Nutzer:in)
- Aggregation pro `user_id`, `study_id`, `module_type`
- Verlauf je Session (Zeitreihe: `started_at`, `completed_at`, Score/Rating)
- Delta-Berechnung: Nutzerwert vs. Studiendurchschnitt

MongoDB Aggregation Beispiel:
$group: {
  _id: { user: "$user_id", study: "$study_id", module: "$module_type" },
  sessions: { $sum: 1 },
  avgScore: { $avg: "$numeric_score" }
}

---

## 7. Study View Aggregation (pro Studie)
- KPI-Kacheln: Teilnehmerzahl, Abschlussrate, Durchschnittswerte, Streuung
- Segmentvergleich nach Testgruppe und Studienversion
- Modulspezifische Zusammenfassung innerhalb einer Studie

MongoDB Aggregation Beispiel:
$group: {
  _id: { study: "$study_id", version: "$study_version", group: "$test_group_id" },
  participants: { $addToSet: "$user_id" },
  completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
  avgRating: { $avg: "$rating" }
}

---

## 8. Chart Payload (UI)
- Standardisiertes Format pro Diagramm:
- `chart_type`
- `labels[]`
- `series[]`
- `filters_applied`
- `generated_at`
