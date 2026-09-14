async function fetchJson(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || `Request failed (${response.status})`;
    throw new Error(data.details ? `${message}: ${data.details}` : message);
  }

  return data;
}

window.lemonApi = {
  getMakes: () => fetchJson('/api/makes'),
  getYears: (make) => fetchJson(`/api/${encodeURIComponent(make)}`),
  getModels: (make, year) => fetchJson(`/api/${encodeURIComponent(make)}/${encodeURIComponent(year)}`),
  getManual: (make, year, model) =>
    fetchJson(`/api/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(model)}`),
  getManualPath: (segments, { alreadyEncoded = false } = {}) =>
    fetchJson(
      `/api/manual/${
        alreadyEncoded ? segments.join('/') : segments.map((segment) => encodeURIComponent(segment)).join('/')
      }`
    )
};
