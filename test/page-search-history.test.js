const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadHistory,
  normalizeQuery,
  saveQuery,
  sanitizeHistory
} = require('../public/js/page-search-history.js');

function createStorage(initialValue) {
  const state = {};
  if (initialValue !== undefined) {
    state['lime.pageSearchHistory'] = initialValue;
  }

  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    setItem(key, value) {
      state[key] = value;
    }
  };
}

test('normalizeQuery trims and collapses whitespace', () => {
  assert.equal(normalizeQuery('  brake   bleeding  '), 'brake bleeding');
});

test('loadHistory ignores invalid storage payloads', () => {
  const history = loadHistory(createStorage('not json'));
  assert.deepEqual(history, []);
});

test('sanitizeHistory removes blanks and case-insensitive duplicates', () => {
  assert.deepEqual(
    sanitizeHistory([' Brakes ', 'brakes', '', null, 'Engine Diagnostics']),
    ['Brakes', 'Engine Diagnostics']
  );
});

test('saveQuery prepends, deduplicates, and persists recent searches', () => {
  const storage = createStorage(JSON.stringify(['Torque Specs', 'Wiring Diagram']));

  const history = saveQuery(storage, ' wiring   diagram ');

  assert.deepEqual(history, ['wiring diagram', 'Torque Specs']);
  assert.equal(storage.getItem('lime.pageSearchHistory'), JSON.stringify(history));
});

test('saveQuery ignores empty queries and leaves history unchanged', () => {
  const storage = createStorage(JSON.stringify(['Specifications']));

  const history = saveQuery(storage, '   ');

  assert.deepEqual(history, ['Specifications']);
  assert.equal(storage.getItem('lime.pageSearchHistory'), JSON.stringify(['Specifications']));
});
