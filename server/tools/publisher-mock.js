const http = require('http');
const { randomUUID } = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 9001;

const store = new Map();

const sendJson = (res, status, obj) => {
  const s = JSON.stringify(obj);
  // Add CORS headers for browser clients (adjust origin in production)
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(s));
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.writeHead(status);
  res.end(s);
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method || 'GET';
  // Health
  if (method === 'GET' && parsed.pathname === '/v1/api') {
    return sendJson(res, 200, { service: 'walrus-publisher-mock', status: 'ok', version: '0.1.0' });
  }

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    // Minimal response for preflight
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.writeHead(204);
    return res.end();
  }

  // List blobs
  if (method === 'GET' && parsed.pathname === '/v1/blobs') {
    const items = Array.from(store.keys());
    return sendJson(res, 200, { blobs: items, count: items.length });
  }

  // Get single blob
  const blobMatch = parsed.pathname && parsed.pathname.match(/^\/v1\/blobs\/(.+)$/);
  if (method === 'GET' && blobMatch) {
    const id = blobMatch[1];
    if (!store.has(id)) return sendJson(res, 404, { error: 'not_found' });
    return sendJson(res, 200, { id, content: store.get(id) });
  }

  // Publish blob (PUT /v1/blobs)
  if (method === 'PUT' && parsed.pathname === '/v1/blobs') {
    let body = '';
    req.on('data', (chunk) => body += chunk.toString());
    req.on('end', () => {
      const id = `sim_${randomUUID()}`;
      store.set(id, body);
      const epochs = parsed.query && parsed.query.epochs ? parsed.query.epochs : null;
      return sendJson(res, 201, { id, status: 'uploaded', epochs });
    });
    return;
  }

  // Default
  sendJson(res, 404, { error: 'not_implemented' });
});

server.listen(PORT, () => {
  console.log(`📦 Walrus publisher mock listening on http://127.0.0.1:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
