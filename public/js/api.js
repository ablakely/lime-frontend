(function lemonApiSetup(globalObject) {
  async function fetchJson(path) {
    const response = await fetch(path);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || `Request failed (${response.status})`;
      throw new Error(data.details ? `${message}: ${data.details}` : message);
    }

    return data;
  }

  async function fetchManual(path) {
    const response = await fetch(path);
    return globalObject.manualResponse.parseManualApiResponse(response);
  }

  function appendIndexHtmlPath(path) {
    if (path.endsWith('/index.html')) {
      return path;
    }

    return `${path.replace(/\/+$/, '')}/index.html`;
  }

  async function fetchManualWithIndexFallback(path, shouldTryIndexFallback = false) {
    const primary = await fetchManual(path);
    if (!shouldTryIndexFallback || primary.kind === 'html') {
      return primary;
    }

    const fallbackPath = appendIndexHtmlPath(path);

    try {
      const fallback = await fetchManual(fallbackPath);
      if (fallback.kind === 'html') {
        return fallback;
      }
    } catch (_error) {
      // Preserve existing rendering flow when index fallback is unavailable.
    }

    return primary;
  }

  const lemonApi = {
    getMakes: () => fetchJson('/api/makes'),
    getYears: (make) => fetchJson(`/api/${encodeURIComponent(make)}`),
    getModels: (make, year) => fetchJson(`/api/${encodeURIComponent(make)}/${encodeURIComponent(year)}`),
    getManual: (make, year, model) =>
      fetchJson(`/api/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(model)}`),
    getManualPath: (segments) => fetchManual(`/api/manual/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`),
    getManualPathFromRawSegments: (rawSegments) => fetchManual(`/api/manual/${rawSegments.join('/')}`),
    getManualPathWithIndexFallbackFromRawSegments: (rawSegments) =>
      fetchManualWithIndexFallback(`/api/manual/${rawSegments.join('/')}`, rawSegments.length > 3)
  };

  globalObject.lemonApi = lemonApi;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      appendIndexHtmlPath,
      fetchManualWithIndexFallback,
      lemonApi
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
