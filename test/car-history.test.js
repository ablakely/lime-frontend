const test = require('node:test');
const assert = require('node:assert/strict');
const { loadHistory, saveSelection, toHistoryLabel } = require('../public/js/car-history.js');

function createStorage(initialValue) {
  const state = {};
  if (initialValue !== undefined) {
    state['lime.quickNavHistory'] = initialValue;
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

test('loadHistory ignores invalid storage payloads', () => {
  const history = loadHistory(createStorage('not json'));
  assert.deepEqual(history, []);
});

test('saveSelection prepends, deduplicates, and persists recent cars', () => {
  const storage = createStorage(
    JSON.stringify([
      { make: 'Ford', year: '2020', model: 'F-150' },
      { make: 'Buick', year: '2012', model: 'LaCrosse' }
    ])
  );

  const history = saveSelection(storage, { make: 'Buick', year: '2012', model: 'LaCrosse' });

  assert.deepEqual(history, [
    { make: 'Buick', year: '2012', model: 'LaCrosse' },
    { make: 'Ford', year: '2020', model: 'F-150' }
  ]);
  assert.equal(
    storage.getItem('lime.quickNavHistory'),
    JSON.stringify(history)
  );
});

test('toHistoryLabel joins the selected car parts', () => {
  assert.equal(
    toHistoryLabel({ make: 'GMC', year: '1998', model: 'Cab & Chassis C3500' }),
    'GMC / 1998 / Cab & Chassis C3500'
  );
});
