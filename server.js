const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LEMON_API_URL = (process.env.LEMON_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');

app.use(express.static('public'));

function lemonUrl(pathname) {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${LEMON_API_URL}${normalized}`;
}

async function proxyJson(res, pathname) {
  try {
    const response = await fetch(lemonUrl(pathname), {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `LEMON API request failed (${response.status})`,
        details: text || response.statusText
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      return res.status(502).json({
        error: 'LEMON API returned a non-JSON response',
        details: text.slice(0, 500)
      });
    }

    return res.json(await response.json());
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to connect to LEMON API',
      details: error.message
    });
  }
}

async function proxyManual(res, pathname) {
  try {
    const response = await fetch(lemonUrl(pathname), {
      headers: { Accept: 'text/html, application/json' }
    });
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (!response.ok) {
      if (contentType.includes('application/json')) {
        try {
          const data = JSON.parse(body);
          return res.status(response.status).json({
            error: data.error || `LEMON API request failed (${response.status})`,
            details: data.details || response.statusText
          });
        } catch (_error) {
          // Fall through to text error payload.
        }
      }

      return res.status(response.status).json({
        error: `LEMON API request failed (${response.status})`,
        details: body || response.statusText
      });
    }

    if (contentType.includes('application/json')) {
      return res.type('application/json').send(body);
    }

    return res.type(contentType || 'text/html').send(body);
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to connect to LEMON API',
      details: error.message
    });
  }
}

app.get('/api/makes', async (_req, res) => proxyJson(res, '/'));
app.get('/api/:make', async (req, res) => proxyJson(res, `/${encodeURIComponent(req.params.make)}/`));
app.get('/api/:make/:year', async (req, res) =>
  proxyJson(res, `/${encodeURIComponent(req.params.make)}/${encodeURIComponent(req.params.year)}/`)
);
app.get('/api/:make/:year/:model', async (req, res) =>
  proxyJson(
    res,
    `/${encodeURIComponent(req.params.make)}/${encodeURIComponent(req.params.year)}/${encodeURIComponent(req.params.model)}/`
  )
);
app.get('/api/manual/*path', async (req, res) => {
  const manualPrefix = '/api/manual/';
  const requestPath = req.originalUrl.split('?')[0];
  const manualPath = requestPath.startsWith(manualPrefix)
    ? requestPath.slice(manualPrefix.length)
    : (Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path);
  return proxyManual(res, `/${manualPath}`);
});

app.get(/^\/(?!api).*/, (_req, res) => {
  res.type('html').send(INDEX_HTML);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`lime-frontend listening on http://localhost:${PORT}`);
    console.log(`Proxying LEMON API: ${LEMON_API_URL}`);
  });
}

module.exports = {
  app,
  lemonUrl,
  proxyJson,
  proxyManual
};
