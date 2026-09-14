const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');

const realFetch = global.fetch;

async function startServer() {
  delete require.cache[require.resolve('../server.js')];
  const { app } = require('../server.js');
  const server = http.createServer(app);
  server.listen(0);
  await once(server, 'listening');
  return server;
}

test('manual api route proxies html responses without converting them to json', async (t) => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'http://localhost:8080/Chevrolet/2001/Astro%20Van%20Cargo%2C%20RWD/');
    assert.equal(options.headers.Accept, 'text/html, application/json');

    return new Response('<section><h1>Repair and Diagnosis</h1></section>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' }
    });
  };

  const server = await startServer();
  t.after(() => {
    global.fetch = realFetch;
    server.close();
  });

  const response = await realFetch(`http://127.0.0.1:${server.address().port}/api/manual/Chevrolet/2001/Astro%20Van%20Cargo%2C%20RWD/`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(await response.text(), /Repair and Diagnosis/);
});

test('manual api route preserves directory json payloads', async (t) => {
  global.fetch = async () => new Response(JSON.stringify({
    title: 'Chevrolet: 2001: Astro Van Cargo, RWD',
    breadcrumbs: [{ label: 'Chevrolet', href: '/Chevrolet/' }],
    topics: [],
    manuals: [{ name: 'Labor Times', uri: '/Chevrolet/2001/Astro%20Van%20Cargo%2C%20RWD/Labor%20Times/' }]
  }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

  const server = await startServer();
  t.after(() => {
    global.fetch = realFetch;
    server.close();
  });

  const response = await realFetch(`http://127.0.0.1:${server.address().port}/api/manual/Chevrolet/2001/Astro%20Van%20Cargo%2C%20RWD/`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await response.json(), {
    title: 'Chevrolet: 2001: Astro Van Cargo, RWD',
    breadcrumbs: [{ label: 'Chevrolet', href: '/Chevrolet/' }],
    topics: [],
    manuals: [{ name: 'Labor Times', uri: '/Chevrolet/2001/Astro%20Van%20Cargo%2C%20RWD/Labor%20Times/' }]
  });
});
