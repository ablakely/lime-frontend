const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const quickNavAutocomplete = require('../public/js/quick-nav-autocomplete.js');

class ClassListStub {
  constructor(initialClasses = []) {
    this.classes = new Set(initialClasses);
  }

  add(...classNames) {
    classNames.forEach((className) => this.classes.add(className));
  }

  remove(...classNames) {
    classNames.forEach((className) => this.classes.delete(className));
  }

  contains(className) {
    return this.classes.has(className);
  }

  toggle(className, force) {
    if (force === true) {
      this.classes.add(className);
      return true;
    }

    if (force === false) {
      this.classes.delete(className);
      return false;
    }

    if (this.classes.has(className)) {
      this.classes.delete(className);
      return false;
    }

    this.classes.add(className);
    return true;
  }
}

class ElementStub {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = String(tagName).toUpperCase();
    this.value = '';
    this.textContent = '';
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.listeners = new Map();
    this.classList = new ClassListStub();
    this.focusCount = 0;
    this.ownerDocument = null;
    this._innerHTML = '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type).push(listener);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  focus() {
    this.focusCount += 1;
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  closest() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function loadAppModule() {
  const ids = [
    'content',
    'loading',
    'message',
    'search-empty-state',
    'breadcrumbs',
    'page-search',
    'toggle-theme',
    'quick-nav-form',
    'quick-nav-section',
    'toggle-quick-nav',
    'quick-history',
    'clear-quick-history',
    'quick-make',
    'quick-year',
    'quick-model',
    'quick-make-menu',
    'quick-year-menu',
    'quick-model-menu'
  ];

  const elements = Object.fromEntries(ids.map((id) => [id, new ElementStub(id)]));
  Object.values(elements).forEach((element) => {
    element.ownerDocument = null;
  });

  const document = {
    activeElement: null,
    documentElement: new ElementStub('document-element', 'html'),
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      const element = new ElementStub('', tagName);
      element.ownerDocument = document;
      return element;
    }
  };

  Object.values(elements).forEach((element) => {
    element.ownerDocument = document;
  });
  document.documentElement.ownerDocument = document;

  const window = {
    document,
    location: { pathname: '/', origin: 'http://localhost' },
    history: { pushState() {} },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    open() {},
    routeUtils: {
      shouldShowQuickNavByDefault() {
        return true;
      },
      parsePathname() {
        return { rawParts: [], decodedParts: [] };
      }
    },
    pageSearch: {
      matchesSearchQuery() {
        return true;
      },
      filterGroupedItems(definitions) {
        return definitions.map(() => true);
      },
      getGroupedItemSectionNames(definitions) {
        return definitions.map(() => '');
      },
      normalizeSearchText(value) {
        return String(value || '').trim().toLowerCase();
      }
    },
    manualImages: {
      getImageOpenUrl() {
        return '';
      }
    },
    carHistory: {
      loadHistory() {
        return [];
      },
      saveSelection(_storage, selection) {
        return [selection];
      },
      clearHistory() {
        return [];
      },
      toHistoryLabel(selection) {
        return [selection.make, selection.year, selection.model].filter(Boolean).join(' / ');
      }
    },
    quickNavAutocomplete,
    lemonApi: {
      async getYears() {
        return ['2024', '2023'];
      },
      async getModels() {
        return [{ model: 'F-150', engines: [{ name: 'XL' }] }];
      }
    }
  };

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require,
    console,
    window,
    document,
    HTMLElement: ElementStub,
    URL,
    feather: undefined,
    $() {
      return {
        val() {},
        html() {
          return this;
        },
        find() {
          return this;
        },
        addClass() {
          return this;
        },
        each() {
          return this;
        }
      };
    }
  };

  const appPath = path.resolve(__dirname, '../public/js/app.js');
  const source = fs.readFileSync(appPath, 'utf8').replace(
    /initializeApp\(\);\s*$/,
    'module.exports = { selectAutocompleteSuggestion, quickMake, quickYear, quickModel, getCachedYears: () => cachedYears, getCachedModels: () => cachedModels };'
  );

  vm.runInNewContext(source, sandbox, { filename: appPath });
  return { app: sandbox.module.exports, document };
}

test('selecting a make suggestion focuses the year input after loading years', async () => {
  const { app, document } = loadAppModule();

  app.selectAutocompleteSuggestion('make', 'Ford');
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(app.quickMake.value, 'Ford');
  assert.deepEqual(app.getCachedYears(), ['2024', '2023']);
  assert.equal(document.activeElement, app.quickYear);
  assert.equal(app.quickYear.focusCount, 1);
});

test('selecting a year suggestion focuses the model input after loading models', async () => {
  const { app, document } = loadAppModule();
  app.quickMake.value = 'Ford';

  app.selectAutocompleteSuggestion('year', '2024');
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(app.quickYear.value, '2024');
  assert.deepEqual(app.getCachedModels(), ['F-150 XL']);
  assert.equal(document.activeElement, app.quickModel);
  assert.equal(app.quickModel.focusCount, 1);
});
