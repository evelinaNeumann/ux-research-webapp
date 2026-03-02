import {
  DEFAULT_PRIVACY_ACK_LABEL,
  DEFAULT_PRIVACY_POLICY_DATE,
  DEFAULT_PRIVACY_POLICY_TEXT,
  DEFAULT_PRIVACY_POLICY_VERSION,
  DEFAULT_STUDY_CONSENT_LABEL,
} from '../constants/privacy.js';
import { PrivacyPolicy } from '../models/PrivacyPolicy.js';

const PRIVACY_POLICY_KEY = 'default';

function trimOrFallback(value, fallback) {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function toPublicPolicy(doc) {
  return {
    version: String(doc.version || DEFAULT_PRIVACY_POLICY_VERSION),
    date: String(doc.date || DEFAULT_PRIVACY_POLICY_DATE),
    text: String(doc.text || DEFAULT_PRIVACY_POLICY_TEXT),
    privacy_ack_label: String(doc.privacy_ack_label || DEFAULT_PRIVACY_ACK_LABEL),
    study_consent_label: String(doc.study_consent_label || DEFAULT_STUDY_CONSENT_LABEL),
    revision: Number(doc.revision || 1),
    updated_at: doc.updated_at || null,
  };
}

async function createDefaultPolicy() {
  return PrivacyPolicy.create({
    key: PRIVACY_POLICY_KEY,
    version: DEFAULT_PRIVACY_POLICY_VERSION,
    date: DEFAULT_PRIVACY_POLICY_DATE,
    text: DEFAULT_PRIVACY_POLICY_TEXT,
    privacy_ack_label: DEFAULT_PRIVACY_ACK_LABEL,
    study_consent_label: DEFAULT_STUDY_CONSENT_LABEL,
    revision: 1,
  });
}

export async function getCurrentPrivacyPolicyDoc() {
  let policy = await PrivacyPolicy.findOne({ key: PRIVACY_POLICY_KEY });
  if (!policy) {
    policy = await createDefaultPolicy();
  }
  return policy;
}

export async function getCurrentPrivacyPolicy() {
  const doc = await getCurrentPrivacyPolicyDoc();
  return toPublicPolicy(doc);
}

export async function updatePrivacyPolicy(payload = {}, updatedBy = null) {
  const doc = await getCurrentPrivacyPolicyDoc();
  const next = {
    version: trimOrFallback(payload.version, doc.version),
    date: trimOrFallback(payload.date, doc.date),
    text: trimOrFallback(payload.text, doc.text),
    privacy_ack_label: trimOrFallback(payload.privacy_ack_label, doc.privacy_ack_label),
    study_consent_label: trimOrFallback(payload.study_consent_label, doc.study_consent_label),
  };

  const changed =
    next.version !== doc.version ||
    next.date !== doc.date ||
    next.text !== doc.text ||
    next.privacy_ack_label !== doc.privacy_ack_label ||
    next.study_consent_label !== doc.study_consent_label;

  doc.version = next.version;
  doc.date = next.date;
  doc.text = next.text;
  doc.privacy_ack_label = next.privacy_ack_label;
  doc.study_consent_label = next.study_consent_label;
  if (updatedBy) doc.updated_by = updatedBy;
  if (changed) {
    doc.revision = Number(doc.revision || 1) + 1;
  }
  await doc.save();
  return toPublicPolicy(doc);
}
