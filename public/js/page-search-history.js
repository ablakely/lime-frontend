(function pageSearchHistorySetup(globalObject) {
  const STORAGE_KEY = 'lime.pageSearchHistory';
  const MAX_HISTORY_ITEMS = 8;

  function normalizeQuery(query) {
    return String(query || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function queriesMatch(left, right) {
    return normalizeQuery(left).toLowerCase() === normalizeQuery(right).toLowerCase();
  }

  function sanitizeHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    const sanitized = [];
    history.forEach((entry) => {
      const normalized = normalizeQuery(entry);
      if (!normalized || sanitized.some((existing) => queriesMatch(existing, normalized))) {
        return;
      }

      sanitized.push(normalized);
    });

    return sanitized.slice(0, MAX_HISTORY_ITEMS);
  }

  function loadHistory(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
      return [];
    }

    try {
      return sanitizeHistory(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'));
    } catch (_error) {
      return [];
    }
  }

  function saveQuery(storage, query) {
    const normalized = normalizeQuery(query);
    const existingHistory = loadHistory(storage);
    if (!normalized) {
      return existingHistory;
    }

    const nextHistory = [
      normalized,
      ...existingHistory.filter((entry) => !queriesMatch(entry, normalized))
    ].slice(0, MAX_HISTORY_ITEMS);

    if (storage && typeof storage.setItem === 'function') {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      } catch (_error) {
        return nextHistory;
      }
    }

    return nextHistory;
  }

  globalObject.pageSearchHistory = {
    loadHistory,
    normalizeQuery,
    saveQuery,
    sanitizeHistory
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      loadHistory,
      normalizeQuery,
      saveQuery,
      sanitizeHistory
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
