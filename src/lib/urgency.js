const URGENCY_LEVELS = [
  "non-urgent",
  "potentially urgent",
  "likely urgent",
  "urgent",
];

const URGENCY_COLORS = {
  "non-urgent": "#3b82f6",
  "potentially urgent": "#eab308",
  "likely urgent": "#f97316",
  urgent: "#dc2626",
};

const DEFAULT_SCORE_BY_LABEL = {
  "non-urgent": 0.1,
  "potentially urgent": 0.45,
  "likely urgent": 0.7,
  urgent: 0.95,
};

const LABEL_ALIASES = {
  "non urgent": "non-urgent",
  nonurgent: "non-urgent",
  "non-urgent": "non-urgent",
  low: "non-urgent",
  "potential urgent": "potentially urgent",
  "potentially urgent": "potentially urgent",
  "potentially-urgent": "potentially urgent",
  medium: "potentially urgent",
  "semi urgent": "likely urgent",
  "semi-urgent": "likely urgent",
  "semiurgent": "likely urgent",
  "likely urgent": "likely urgent",
  "likely-urgent": "likely urgent",
  likelyurgent: "likely urgent",
  high: "likely urgent",
  urgent: "urgent",
  critical: "urgent",
};

function clampScore(score) {
  if (!Number.isFinite(score)) return null;
  return Math.min(Math.max(score, 0), 1);
}

export function normalizeUrgencyScore(rawValue) {
  if (rawValue == null || rawValue === "") return null;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;

  // Support payloads that send percentages (0-100).
  if (parsed > 1 && parsed <= 100) {
    return clampScore(parsed / 100);
  }

  return clampScore(parsed);
}

export function normalizeUrgencyLabel(rawLabel) {
  if (!rawLabel) return null;

  const normalized = String(rawLabel)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .replace(/\s*-\s*/g, "-");

  return LABEL_ALIASES[normalized] || LABEL_ALIASES[normalized.replace(/-/g, " ")] || null;
}

export function deriveUrgencyLabelFromScore(score) {
  if (!Number.isFinite(score)) return null;

  if (score >= 0.85) return "urgent";
  if (score >= 0.6) return "likely urgent";
  if (score >= 0.35) return "potentially urgent";
  return "non-urgent";
}

export function deriveUrgencyLabelFromLegacyField(rawUrgency) {
  if (!rawUrgency) return null;

  const normalized = String(rawUrgency).trim().toLowerCase();
  if (normalized === "urgent") return "urgent";
  if (normalized === "non-urgent" || normalized === "non urgent") {
    return "non-urgent";
  }

  
  return null;
}

export function getUrgencyMeta(tweet = {}) {
  const parsedScore = normalizeUrgencyScore(tweet.urgency_score);
  const fromLabel = normalizeUrgencyLabel(tweet.urgency_label);
  const fromScore = deriveUrgencyLabelFromScore(parsedScore);
  const fromLegacy = deriveUrgencyLabelFromLegacyField(tweet.urgency);

  const label = fromLabel || fromScore || fromLegacy || "non-urgent";
  const score = parsedScore ?? DEFAULT_SCORE_BY_LABEL[label] ?? DEFAULT_SCORE_BY_LABEL["non-urgent"];

  return {
    label,
    score,
    color: URGENCY_COLORS[label] || URGENCY_COLORS["non-urgent"],
    isBlinking: label === "urgent",
  };
}

export function isUrgencyLabelUrgent(label) {
  return normalizeUrgencyLabel(label) === "urgent";
}

export { URGENCY_LEVELS, URGENCY_COLORS };
