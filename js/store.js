const ESTIMATES_KEY = 'summer-estimate-app-estimates-v2';
const DRAFT_KEY = 'summer-estimate-app-draft-v2';
const PREFS_KEY = 'summer-estimate-app-preferences-v2';

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export const localStore = {
  listEstimates() {
    const items = parseJson(localStorage.getItem(ESTIMATES_KEY), []);
    return Array.isArray(items) ? items : [];
  },

  saveEstimates(items) {
    localStorage.setItem(ESTIMATES_KEY, JSON.stringify(items));
  },

  getDraft() {
    return parseJson(localStorage.getItem(DRAFT_KEY), null);
  },

  saveDraft(draft) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  },

  clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  },

  getPreferences() {
    return parseJson(localStorage.getItem(PREFS_KEY), {});
  },

  savePreferences(preferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  },
};

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
