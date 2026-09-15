const content = document.getElementById('content');
const loading = document.getElementById('loading');
const message = document.getElementById('message');
const searchEmptyState = document.getElementById('search-empty-state');
const breadcrumbs = document.getElementById('breadcrumbs');
const pageSearchInput = document.getElementById('page-search');
const quickNavForm = document.getElementById('quick-nav-form');
const quickNavSection = document.getElementById('quick-nav-section');
const toggleQuickNavButton = document.getElementById('toggle-quick-nav');
const quickMake = document.getElementById('quick-make');
const quickYear = document.getElementById('quick-year');
const quickModel = document.getElementById('quick-model');
const makeOptions = document.getElementById('make-options');
const yearOptions = document.getElementById('year-options');
const modelOptions = document.getElementById('model-options');

let cachedMakes = [];
let makesHydrationPromise = null;

function updateQuickNavToggleState(isHidden) {
  toggleQuickNavButton.setAttribute('aria-pressed', String(isHidden));
  toggleQuickNavButton.setAttribute('aria-label', isHidden ? 'Show manual finder' : 'Hide manual finder');
  toggleQuickNavButton.setAttribute('title', isHidden ? 'Show manual finder' : 'Hide manual finder');
}

function syncQuickNavForRoute(parts) {
  if (!toggleQuickNavButton || !quickNavSection) {
    return;
  }

  const isHomePage = parts.length === 0;
  if (isHomePage) {
    quickNavSection.classList.remove('d-none');
  }

  toggleQuickNavButton.classList.toggle('d-none', isHomePage);
  updateQuickNavToggleState(quickNavSection.classList.contains('d-none'));
}

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

function decodeHtmlEntities(text) {
  if (typeof text !== 'string' || !text.includes('&')) {
    return text || '';
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
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

  items.forEach(({ title, href, subtitle, badge }) => {
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

    if (badge) {
        const b = document.createElement('span');
        if (badge == 'lemon') {
            b.className = 'badge rounded-pill bg-warning';
        } else {
            b.className = 'badge rounded-pill bg-info';
        }
        b.textContent = badge;
        heading.appendChild(b)
    }
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

function renderEmptyState(text) {
  const notice = document.createElement('div');
  notice.className = 'alert alert-light border mb-0';
  notice.textContent = text;
  return notice;
}

function setSearchEmptyState(text) {
  if (!searchEmptyState) {
    return;
  }

  searchEmptyState.textContent = text || '';
  searchEmptyState.classList.toggle('d-none', !text);
}

function toggleElementVisibility(element, isVisible) {
  element.classList.toggle('d-none', !isVisible);
}

function applyCardListSearch(query) {
  let totalItems = 0;
  let visibleItems = 0;

  content.querySelectorAll('.card-list').forEach((list) => {
    Array.from(list.children).forEach((item) => {
      const isVisible = window.pageSearch.matchesSearchQuery(item.textContent, query);
      toggleElementVisibility(item, isVisible);
      totalItems += 1;
      if (isVisible) {
        visibleItems += 1;
      }
    });
  });

  return { totalItems, visibleItems };
}

function applyGroupedListSearch(query) {
  let totalItems = 0;
  let visibleItems = 0;

  content.querySelectorAll('.list-group').forEach((list) => {
    const children = Array.from(list.children);
    const definitions = children.map((child) => ({
      kind: child.tagName === 'LI' && child.classList.contains('list-group-item-dark') ? 'header' : 'item',
      text: child.textContent
    }));
    const visibility = window.pageSearch.filterGroupedItems(definitions, query);

    children.forEach((child, index) => {
      const isHeader = definitions[index].kind === 'header';
      const isVisible = visibility[index];
      toggleElementVisibility(child, isVisible);

      if (!isHeader) {
        totalItems += 1;
        if (isVisible) {
          visibleItems += 1;
        }
      }
    });
  });

  return { totalItems, visibleItems };
}

function applyPageSearch() {
  if (!pageSearchInput || !window.pageSearch) {
    return;
  }

  const query = pageSearchInput.value;
  const results = [applyCardListSearch(query), applyGroupedListSearch(query)];
  const totalItems = results.reduce((sum, result) => sum + result.totalItems, 0);
  const visibleItems = results.reduce((sum, result) => sum + result.visibleItems, 0);
  const hasQuery = window.pageSearch.normalizeSearchText(query).length > 0;

  if (hasQuery && totalItems > 0 && visibleItems === 0) {
    setSearchEmptyState(`No items on this page match "${query.trim()}".`);
    return;
  }

  setSearchEmptyState('');
}

function renderManualListing(data) {
  const section = document.createElement('section');
  section.className = 'card shadow-sm';

  const body = document.createElement('div');
  body.className = 'card-body';

  const heading = document.createElement('h1');
  heading.className = 'h3 mb-3';
  heading.textContent = decodeHtmlEntities(data.title || 'Manuals');
  body.appendChild(heading);

  if (Array.isArray(data.topics) && data.topics.length > 0) {
    const topics = document.createElement('div');
    topics.className = 'd-flex flex-wrap gap-2 mb-3';

    data.topics.forEach((topic) => {
      const badge = document.createElement('span');
      badge.className = 'badge text-bg-light border';
      badge.textContent = decodeHtmlEntities(topic);
      topics.appendChild(badge);
    });

    body.appendChild(topics);
  }

  if (Array.isArray(data.manuals) && data.manuals.length > 0) {
    const list = document.createElement('div');
    list.className = 'list-group';

    var sections = [];

    data.manuals.forEach(({ name, uri }) => {
      const urisplit = uri.split('/');
      const section = decodeURIComponent(urisplit[urisplit.length - 3]);

      if (sections.indexOf(section) == -1) {
          const header = document.createElement('li');
          header.className = 'list-group-item list-group-item-dark';
          header.textContent = section;
          list.appendChild(header);

          sections.push(section);
      }

      const link = document.createElement('a');
      link.className = 'list-group-item list-group-item-action';
      link.href = uri;
      link.textContent = decodeHtmlEntities(name || uri);
      list.appendChild(link);
    });

    body.appendChild(list);
  } else {
    if (data.content) {
        body.appendChild(renderHtml(data.content));
    } else {
        body.appendChild(renderEmptyState('No manuals were found for this path.'));
    }
  }

  section.appendChild(body);
  return section;
}

function renderiFrame(uri) {
    const iframe = document.createElement('iframe');
    iframe.src = uri;
    return iframe;
}

function rewriteManualImageUrls(rootElement, rawParts) {
  rootElement.querySelectorAll('img[src]').forEach((image) => {
    const source = image.getAttribute('src');
    image.setAttribute('src', window.manualUrl.toManualProxyUrl(source, rawParts));
  });
}

function renderHtml(html) {
    const article = document.createElement('article');

    const $html = $(html);

    $html.find('table').addClass('table table-striped');

    article.classname = 'manual-content';
    article.innerHTML = $html.html();

    return article;
}

function renderManualHtml(html, rawParts) {
  const article = document.createElement('article');
  const $page = $('<div>').html(html).find('.main');

  article.className = 'manual-content';
  $page.find('table').addClass('table table-striped');
  
  article.innerHTML = $page.html();
  return article;
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
  syncQuickNavForRoute(parts);
  showMessage('');
  showLoading(true);
  content.innerHTML = '';
  $("#page-search").val('');
  applyPageSearch();

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
      const years = extractYears(data).map((year) => ({ year })).reverse();
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
            const subtitle = engine.name || entry.model;
            const title = entry.model !== subtitle ? entry.model : ''; 

            modelCards.push({
              subtitle: subtitle,
              badge: engine.database,
              title: title,
              href: `/${encodeURIComponent(make)}/${encodeURIComponent(year)}/${encodeURIComponent(title + ' ' + subtitle)}`
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

    const data = await window.lemonApi.getManualPathFromRawSegments(rawParts);

    if (data.kind === 'directory') {
      const apiBreadcrumbs = Array.isArray(data.data.breadcrumbs) ? data.data.breadcrumbs : [];
      setBreadcrumbs(
        apiBreadcrumbs.map((crumb) => ({
          label: decodeHtmlEntities(crumb.label),
          path: crumb.href
        }))
      );
      content.appendChild(renderManualListing(data.data));
      return;
    }

    setBreadcrumbs(manualBreadcrumbs);

    if (data.kind === 'html') {
      content.appendChild(renderManualHtml(data.data, rawParts));
      return;
    }

    const pre = document.createElement('pre');
    pre.className = 'manual-content';
    pre.textContent = data.kind === 'json' ? JSON.stringify(data.data, null, 2) : data.data;
    content.appendChild(pre);
  } catch (error) {
    showMessage(error.message);
  } finally {
    showLoading(false);
    applyPageSearch();
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

if (toggleQuickNavButton && quickNavSection) {
  toggleQuickNavButton.addEventListener('click', () => {
    const isHidden = quickNavSection.classList.toggle('d-none');
    updateQuickNavToggleState(isHidden);
  });
}

if (pageSearchInput) {
  pageSearchInput.addEventListener('input', applyPageSearch);
}

async function initializeApp() {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }

  let hydrationErrorMessage = '';
  try {
    await hydrateMakesIfNeeded();
  } catch (error) {
    hydrationErrorMessage = error.message;
  }

  await renderRoute();

  if (hydrationErrorMessage && !message.textContent) {
    showMessage(hydrationErrorMessage, 'warning');
  }
}

initializeApp();
