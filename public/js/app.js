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
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.makes)) {
    return data.makes;
  }

  if (Array.isArray(data.years)) {
    return data.years;
  }

  if (Array.isArray(data.models)) {
    return data.models;
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
    .map((make) => (typeof make === 'string' ? make : make.make))
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
  if (cachedMakes.length > 0) {
    return cachedMakes;
  }
  cachedMakes = extractMakes(await window.lemonApi.getMakes());
  fillDataList(makeOptions, cachedMakes);
  return cachedMakes;
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
  const parts = window.location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  showMessage('');
  showLoading(true);
  content.innerHTML = '';

  try {
    if (parts.length === 0) {
      setBreadcrumbs([]);
      const data = await window.lemonApi.getMakes();
      const makes = extractMakes(data).map((make) => ({ make }));
      if (cachedMakes.length === 0) {
        cachedMakes = makes.map(({ make }) => make);
        fillDataList(makeOptions, cachedMakes);
      }
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

    const [make, year, ...modelParts] = parts;
    const model = modelParts.join('/');
    setBreadcrumbs([
      { label: make, path: `/${encodeURIComponent(make)}` },
      { label: year, path: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}` },
      { label: model, path: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(model)}` }
    ]);

    const data = await window.lemonApi.getManualPath([make, year, model]);
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

quickMake.addEventListener('change', () => {
  refreshYearOptions().catch((error) => showMessage(error.message));
});
quickMake.addEventListener('input', () => {
  refreshYearOptions().catch((error) => showMessage(error.message));
});
quickYear.addEventListener('change', () => {
  refreshModelOptions().catch((error) => showMessage(error.message));
});
quickYear.addEventListener('input', () => {
  refreshModelOptions().catch((error) => showMessage(error.message));
});
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

hydrateMakesIfNeeded().catch((error) => showMessage(error.message));
renderRoute();
