const content = document.getElementById('content');
const loading = document.getElementById('loading');
const message = document.getElementById('message');
const breadcrumbs = document.getElementById('breadcrumbs');
const quickNavForm = document.getElementById('quick-nav-form');
const quickMake = document.getElementById('quick-make');
const quickYear = document.getElementById('quick-year');
const quickModel = document.getElementById('quick-model');
const makeOptions = document.getElementById('make-options');
const yearOptions = document.getElementById('year-options');
const modelOptions = document.getElementById('model-options');

let cachedMakes = [];
let makesHydrationPromise = null;

function showLoading(show) {
  loading.classList.toggle('d-none', !show);
}

function showMessage(text, level = 'danger') {
  if (!text) {
    message.className = 'alert d-none';
    message.textContent = '';
    return;
  }

  message.className = `alert alert-${level}`;
  message.textContent = text;
}

function setBreadcrumbs(parts) {
  breadcrumbs.innerHTML = '';
  const crumbs = [{ label: 'Home', path: '/' }, ...parts];

  crumbs.forEach((crumb, index) => {
    const item = document.createElement('li');
    item.className = 'breadcrumb-item';

    const isLast = index === crumbs.length - 1;
    if (isLast) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
      item.textContent = crumb.label;
    } else {
      const link = document.createElement('a');
      link.href = crumb.path;
      link.textContent = crumb.label;
      item.appendChild(link);
    }

    breadcrumbs.appendChild(item);
  });
}

function cardList(items) {
  const row = document.createElement('div');
  row.className = 'row g-3 card-list';

  items.forEach(({ title, href, subtitle }) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    const link = document.createElement('a');
    link.href = href;

    const card = document.createElement('div');
    card.className = 'card h-100 shadow-sm';

    const body = document.createElement('div');
    body.className = 'card-body';

    const heading = document.createElement('h2');
    heading.className = 'h5 card-title mb-1';
    heading.textContent = title;
    body.appendChild(heading);

    if (subtitle) {
      const note = document.createElement('p');
      note.className = 'text-muted small mb-0';
      note.textContent = subtitle;
      body.appendChild(note);
    }

    card.appendChild(body);
    link.appendChild(card);
    col.appendChild(link);
    row.appendChild(col);
  });

  return row;
}

function normalizeArrayPayload(data) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  const candidates = ['makes', 'years', 'models', 'items', 'results', 'data'];
  for (const key of candidates) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
}

function clearDataList(element) {
  element.innerHTML = '';
}

function fillDataList(element, values) {
  clearDataList(element);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    element.appendChild(option);
  });
}

function extractMakes(data) {
  return normalizeArrayPayload(data)
    .map((make) => {
      if (typeof make === 'string') {
        return make;
      }

      if (!make || typeof make !== 'object') {
        return '';
      }

      return make.make || make.name || make.label || make.value || '';
    })
    .filter(Boolean);
}

function extractYears(data) {
  return normalizeArrayPayload(data)
    .map((year) => {
      if (typeof year === 'number' || typeof year === 'string') {
        return String(year);
      }
      return year.year != null ? String(year.year) : '';
    })
    .filter(Boolean);
}

function extractModels(data) {
  const models = [];
  normalizeArrayPayload(data).forEach((entry) => {
    if (typeof entry === 'string') {
      models.push(entry);
      return;
    }

    if (entry.model && Array.isArray(entry.engines) && entry.engines.length > 0) {
      entry.engines.forEach((engine) => {
        models.push(engine.name || entry.model);
      });
      return;
    }

    if (entry.model) {
      models.push(entry.model);
    }
  });
  return models.filter(Boolean);
}

async function hydrateMakesIfNeeded() {
  if (cachedMakes.length > 0 && makeOptions.childElementCount > 0) {
    return cachedMakes;
  }

  if (!makesHydrationPromise) {
    makesHydrationPromise = (async () => {
      try {
        cachedMakes = extractMakes(await window.lemonApi.getMakes());
        fillDataList(makeOptions, cachedMakes);
        return cachedMakes;
      } catch (error) {
        cachedMakes = [];
        clearDataList(makeOptions);
        throw new Error(`Unable to load makes for autocomplete. ${error.message}`);
      } finally {
        makesHydrationPromise = null;
      }
    })();
  }

  return makesHydrationPromise;
}

async function refreshYearOptions() {
  const make = quickMake.value.trim();
  clearDataList(yearOptions);
  clearDataList(modelOptions);
  quickYear.value = '';
  quickModel.value = '';
  if (!make) {
    return;
  }
  const years = extractYears(await window.lemonApi.getYears(make));
  fillDataList(yearOptions, years);
}

async function refreshModelOptions() {
  const make = quickMake.value.trim();
  const year = quickYear.value.trim();
  clearDataList(modelOptions);
  quickModel.value = '';
  if (!make || !year) {
    return;
  }
  const models = extractModels(await window.lemonApi.getModels(make, year));
  fillDataList(modelOptions, models);
}

async function renderRoute() {
  const { rawParts, decodedParts: parts } = window.routeUtils.parsePathname(window.location.pathname);
  showMessage('');
  showLoading(true);
  content.innerHTML = '';

  try {
    if (parts.length === 0) {
      setBreadcrumbs([]);
      const makes = (await hydrateMakesIfNeeded()).map((make) => ({ make }));
      content.appendChild(
        cardList(
          makes.map(({ make }) => ({
            title: make,
            href: `/${encodeURIComponent(make)}`
          }))
        )
      );
      return;
    }

    if (parts.length === 1) {
      const [make] = parts;
      setBreadcrumbs([{ label: make, path: `/${encodeURIComponent(make)}` }]);
      const data = await window.lemonApi.getYears(make);
      const years = extractYears(data).map((year) => ({ year }));
      content.appendChild(
        cardList(
          years.map(({ year }) => ({
            title: String(year),
            href: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}`
          }))
        )
      );
      return;
    }

    if (parts.length === 2) {
      const [make, year] = parts;
      setBreadcrumbs([
        { label: make, path: `/${encodeURIComponent(make)}` },
        { label: year, path: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}` }
      ]);
      const data = await window.lemonApi.getModels(make, year);
      const models = normalizeArrayPayload(data);
      const modelCards = [];

      models.forEach((entry) => {
        if (typeof entry === 'string') {
          modelCards.push({
            title: entry,
            href: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(entry)}`
          });
          return;
        }

        if (entry.model && Array.isArray(entry.engines) && entry.engines.length > 0) {
          entry.engines.forEach((engine) => {
            const modelName = engine.name || entry.model;
            modelCards.push({
              title: modelName,
              subtitle: entry.model !== modelName ? entry.model : '',
              href: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(modelName)}`
            });
          });
          return;
        }

        if (entry.model) {
          modelCards.push({
            title: entry.model,
            href: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(entry.model)}`
          });
        }
      });

      content.appendChild(cardList(modelCards));
      return;
    }

    const manualBreadcrumbs = parts.map((label, index) => ({
      label,
      path: `/${rawParts.slice(0, index + 1).join('/')}`
    }));
    setBreadcrumbs(manualBreadcrumbs);

    const data = await window.lemonApi.getManualPath(rawParts, { alreadyEncoded: true });
    const pre = document.createElement('pre');
    pre.className = 'manual-content';
    pre.textContent = JSON.stringify(data, null, 2);
    content.appendChild(pre);
  } catch (error) {
    showMessage(error.message);
  } finally {
    showLoading(false);
  }
}

window.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="/"]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) {
    return;
  }

  event.preventDefault();
  window.history.pushState({}, '', link.getAttribute('href'));
  renderRoute();
});

window.addEventListener('popstate', renderRoute);

function debounce(fn, delayMs = 200) {
  let debounceTimeoutId = null;
  return (...args) => {
    window.clearTimeout(debounceTimeoutId);
    debounceTimeoutId = window.setTimeout(() => fn(...args), delayMs);
  };
}

const refreshYearOptionsOnInput = debounce(() => {
  const value = quickMake.value.trim();
  if (!cachedMakes.includes(value)) {
    clearDataList(yearOptions);
    clearDataList(modelOptions);
    quickYear.value = '';
    quickModel.value = '';
    return;
  }
  refreshYearOptions().catch((error) => showMessage(error.message));
});

const refreshModelOptionsOnInput = debounce(() => {
  const selectedYear = quickYear.value.trim();
  const knownYears = Array.from(yearOptions.querySelectorAll('option')).map((option) => option.value);
  if (!knownYears.includes(selectedYear)) {
    clearDataList(modelOptions);
    quickModel.value = '';
    return;
  }
  refreshModelOptions().catch((error) => showMessage(error.message));
});

quickMake.addEventListener('change', () => {
  refreshYearOptions().catch((error) => showMessage(error.message));
});
quickMake.addEventListener('input', refreshYearOptionsOnInput);
quickYear.addEventListener('change', () => {
  refreshModelOptions().catch((error) => showMessage(error.message));
});
quickYear.addEventListener('input', refreshModelOptionsOnInput);
quickNavForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const make = quickMake.value.trim();
  const year = quickYear.value.trim();
  const model = quickModel.value.trim();

  if (!make) {
    showMessage('Select a make before navigating.');
    return;
  }

  if (model && !year) {
    showMessage('Select a year before selecting a model.');
    return;
  }

  const path = model
    ? `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(model)}`
    : year
      ? `/${encodeURIComponent(make)}/${encodeURIComponent(year)}`
      : `/${encodeURIComponent(make)}`;
  window.history.pushState({}, '', path);
  renderRoute();
});

async function initializeApp() {
  let hydrationErrorMessage = '';
  try {
    await hydrateMakesIfNeeded();
  } catch (error) {
    hydrationErrorMessage = error.message;
  }

  await renderRoute();

  if (hydrationErrorMessage) {
    showMessage(hydrationErrorMessage, 'warning');
  }
}

initializeApp();
