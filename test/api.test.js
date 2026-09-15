const test = require('node:test');
const assert = require('node:assert/strict');
const manualResponse = require('../public/js/manual-response.js');
const { appendIndexHtmlPath, fetchManualWithIndexFallback } = require('../public/js/api.js');

const realFetch = global.fetch;
const realManualResponse = global.manualResponse;

test('appendIndexHtmlPath appends index without malformed slashes', () => {
  assert.equal(appendIndexHtmlPath('/api/manual/Ford/2020/Topic/'), '/api/manual/Ford/2020/Topic/index.html');
  assert.equal(appendIndexHtmlPath('/api/manual/Ford/2020/Topic'), '/api/manual/Ford/2020/Topic/index.html');
  assert.equal(appendIndexHtmlPath('/api/manual/Ford/2020/Topic/index.html'), '/api/manual/Ford/2020/Topic/index.html');
});

test('fetchManualWithIndexFallback returns html fallback for deep manual paths', async (t) => {
  global.manualResponse = manualResponse;
  const calls = [];
  const basePath = '/api/manual/Chevrolet/2001/Astro%20Van/Removal%20%26%20Installation';

  global.fetch = async (url) => {
    calls.push(url);
    if (url === basePath) {
      return new Response(JSON.stringify({
        title: 'Removal & Installation',
        breadcrumbs: [],
        topics: [],
        manuals: []
      }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    if (url === `${basePath}/index.html`) {
      return new Response('<article><h1>Removal &amp; Installation</h1></article>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
    }

    return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  };

  t.after(() => {
    global.fetch = realFetch;
    global.manualResponse = realManualResponse;
  });

  const parsed = await fetchManualWithIndexFallback(basePath, true);

  assert.equal(parsed.kind, 'html');
  assert.match(parsed.data, /Removal/);
  assert.deepEqual(calls, [basePath, `${basePath}/index.html`]);
});

test('fetchManualWithIndexFallback preserves original payload when fallback is unavailable', async (t) => {
  global.manualResponse = manualResponse;
  const basePath = '/api/manual/Chevrolet/2001/Astro%20Van/Engine';

  global.fetch = async (url) => {
    if (url === basePath) {
      return new Response(JSON.stringify({
        title: 'Engine',
        breadcrumbs: [],
        topics: ['Service Information'],
        manuals: [{ name: 'Specifications', uri: '/Chevrolet/2001/Astro%20Van/Engine/Specifications/' }]
      }), {
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('missing', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  };

  t.after(() => {
    global.fetch = realFetch;
    global.manualResponse = realManualResponse;
  });

  const parsed = await fetchManualWithIndexFallback(basePath, true);

  assert.equal(parsed.kind, 'directory');
  assert.equal(parsed.data.title, 'Engine');
  assert.equal(parsed.data.manuals.length, 1);
});
