const ESTIMATES_KEY = 'summer-estimate-app-estimates-v2';
const CLOUD_CACHE_KEY = 'summer-estimate-app-cloud-cache-v1';
const DRAFT_KEY = 'summer-estimate-app-draft-v2';
const PREFS_KEY = 'summer-estimate-app-preferences-v2';
const LOCAL_MODE_KEY = 'summer-estimate-app-local-mode-v1';

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

  listCloudCache() {
    const items = parseJson(localStorage.getItem(CLOUD_CACHE_KEY), []);
    return Array.isArray(items) ? items : [];
  },

  saveCloudCache(items) {
    localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(items));
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

  getLocalMode() {
    return localStorage.getItem(LOCAL_MODE_KEY) === 'true';
  },

  setLocalMode(enabled) {
    localStorage.setItem(LOCAL_MODE_KEY, enabled ? 'true' : 'false');
  },
};

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
