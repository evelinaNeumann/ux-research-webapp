export const DEFAULT_PRIVACY_POLICY_VERSION = '1.0';
export const DEFAULT_PRIVACY_POLICY_DATE = '02.03.2026';

export function buildPrivacyAckLabel(version = DEFAULT_PRIVACY_POLICY_VERSION, date = DEFAULT_PRIVACY_POLICY_DATE) {
  return `Ich habe die Datenschutzerklaerung (Version ${version}, Stand ${date}) gelesen und zur Kenntnis genommen.`;
}

export const DEFAULT_PRIVACY_ACK_LABEL = buildPrivacyAckLabel(
  DEFAULT_PRIVACY_POLICY_VERSION,
  DEFAULT_PRIVACY_POLICY_DATE
);

export const DEFAULT_STUDY_CONSENT_LABEL =
  'Ich willige in die Verarbeitung meiner im Rahmen der UX-Studie erhobenen Daten fuer Auswertung, wissenschaftlich orientierte Projektarbeit und Dokumentation im Modul DLBMIUID02 ein. Mir ist bekannt, dass ich diese Einwilligung jederzeit mit Wirkung fuer die Zukunft widerrufen kann.';

export const DEFAULT_PRIVACY_POLICY_TEXT = `Datenschutzerklaerung

Stand: 02.03.2026
Version: 1.0

1. Verantwortliche Stelle
Dieses System wird im Rahmen eines privaten Hochschulprojekts im Modul DLBMIUID02 - User Interface Design betrieben.

2. Zweck der Verarbeitung
- Registrierung und Authentifizierung
- Durchfuehrung und Auswertung von UX-Studien
- wissenschaftlich orientierte Projektarbeit und Dokumentation
- technischer Betrieb, Sicherheit und Fehleranalyse

3. Verarbeitete Daten
- Kontodaten (Benutzername, Passwort-Hash, Rolle)
- Profildaten je Studie (Alter, Rolle, wichtige Woerter)
- Forschungsdaten (Antworten, Aufgabeninteraktionen, Markierungen, Zeitstempel)
- technische Logdaten

4. Rechtsgrundlagen
- Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhaeltnis)
- Art. 6 Abs. 1 lit. f DSGVO (Sicherheit/Betrieb)
- Art. 6 Abs. 1 lit. a DSGVO (Einwilligung fuer Studienverarbeitung)

5. Anonymisierung im Projektkontext
Die Aufgabenstellung fordert die Anonymisierung personenbezogener Daten. Auswertungen und Berichte werden daher ohne direkte Klarnamen erstellt.

6. Speicherdauer
Speicherung nur solange fuer Projektzweck erforderlich; danach Loeschung oder vollstaendige Anonymisierung, soweit keine gesetzlichen Pflichten entgegenstehen.

7. Betroffenenrechte
Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit, Widerspruch und Widerruf erteilter Einwilligungen mit Wirkung fuer die Zukunft.

8. Beschwerderecht
Beschwerde bei der zustaendigen Datenschutzaufsichtsbehoerde ist moeglich.
`;

export function hasAcceptedPrivacy(user, requiredRevision = 1) {
  const privacyRevision = Number(user?.privacy_policy_revision_acknowledged || 0);
  const studyRevision = Number(user?.study_data_consent_revision_acknowledged || 0);
  if (privacyRevision > 0 || studyRevision > 0) {
    return Boolean(
      user?.privacy_notice_acknowledged_at &&
        privacyRevision === Number(requiredRevision || 1) &&
        user?.study_data_consent_at &&
        studyRevision === Number(requiredRevision || 1)
    );
  }
  return Boolean(
    Number(requiredRevision || 1) <= 1 &&
      user?.privacy_notice_acknowledged_at &&
      user?.privacy_notice_version_acknowledged === DEFAULT_PRIVACY_POLICY_VERSION &&
      user?.study_data_consent_at &&
      user?.study_data_consent_version === DEFAULT_PRIVACY_POLICY_VERSION
  );
}
