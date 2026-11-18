const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const ROOT = __dirname;
const SMARTAPI_KEY = 'sk-smart-J6NAKcsgKoJ_tfaOrfapSY14L1W8us5GR4ZZ3FwPIO8';
const SMARTAPI_HOST = 'api.smartapi.pro';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Handle Astra AI Query Proxy
  if (req.method === 'POST' && req.url === '/api/astra') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const userPrompt = parsed.prompt || 'Расскажи о кабеле МКСБ 4x4x1.2';
        
        const payload = JSON.stringify({
          model: 'gpt-6-astra',
          messages: [
            {
              role: 'system',
              content: 'Ты главный инженер проекта демонтажа кабеля МКСБ 4×4×1,2 на МГ САЦ (Джангалинское ЛПУ, Казахстан) для Тагира Искалиева. Отвечай емко, профессионально, с точными цифрами и нормами ГОСТ 15125-92.'
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.6,
          max_tokens: 3500
        });

        const astraReq = https.request({
          hostname: SMARTAPI_HOST,
          port: 443,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + SMARTAPI_KEY,
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (astraRes) => {
          let astraData = '';
          astraRes.on('data', c => astraData += c);
          astraRes.on('end', () => {
            res.writeHead(astraRes.statusCode || 200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(astraData);
          });
        });

        astraReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e.message }));
        });

        astraReq.write(payload);
        astraReq.end();

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Handle CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // Handle Static Files
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  
  const filePath = path.normalize(path.join(ROOT, reqPath));
  
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Access denied');
    return;
  }
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[QazaqGaz Cable 3D · GPT-6 Astra] Server running at http://127.0.0.1:${PORT}/`);
});
