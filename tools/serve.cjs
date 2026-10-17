#!/usr/bin/env node
/**
 * Cross-platform local dev server: node tools/serve.cjs [port]
 * Matches tools/serve.py: gzip compression, no-store caching, proper MIME types.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.argv[2], 10) || 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const GZIP_EXTS = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg',
  '.wasm', '.glb', '.ico', '.txt', '.webmanifest', '.md'
]);

const cache = new Map();

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`).pathname);
  let filePath = path.join(ROOT, urlPath.replace(/^\/+/, ''));

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const shouldGzip = GZIP_EXTS.has(ext) && acceptEncoding.includes('gzip');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    if (shouldGzip) {
      const stat = fs.statSync(filePath);
      const cacheKey = `${filePath}:${stat.mtimeMs}`;
      let body = cache.get(cacheKey);

      if (!body) {
        const raw = fs.readFileSync(filePath);
        body = zlib.gzipSync(raw, { level: 6 });
        cache.set(cacheKey, body);
      }

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', body.length);
      res.writeHead(200);
      res.end(body);
    } else {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end('Server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}/`);
});
