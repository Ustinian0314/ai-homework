const http = require('http' );
const https = require('https' );
const url = require('url');

// 監聽 Render 提供的 PORT 環境變數，如果沒有則預設為 3000 (用於本地開發)
const PORT = process.env.PORT || 3000;
const TARGET_URL = 'https://d7115248324e.ngrok-free.app';

// 創建代理服務器
const server = http.createServer((req, res ) => {
  // 設置 CORS 標頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 處理 OPTIONS 預檢請求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 解析請求路徑
  const parsedUrl = url.parse(req.url);
  const targetPath = parsedUrl.pathname + (parsedUrl.search || '');
  const targetUrl = TARGET_URL + targetPath;

  console.log(`代理請求: ${req.method} ${targetUrl}`);

  // 設置目標請求的選項
  const options = {
    hostname: 'd7115248324e.ngrok-free.app',
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      'ngrok-skip-browser-warning': 'true'
    }
  };

  // 移除可能導致問題的標頭
  delete options.headers.host;
  delete options.headers.origin;
  delete options.headers.referer;

  // 創建 HTTPS 請求到目標服務器
  const proxyReq = https.request(options, (proxyRes ) => {
    // 設置響應標頭
    res.statusCode = proxyRes.statusCode;
    
    // 複製響應標頭，但確保 CORS 標頭正確
    Object.keys(proxyRes.headers).forEach(key => {
      if (!key.toLowerCase().startsWith('access-control')) {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });

    // 轉發響應數據
    proxyRes.pipe(res);
  });

  // 處理代理請求錯誤
  proxyReq.on('error', (err) => {
    console.error('代理請求錯誤:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '代理服務器錯誤: ' + err.message }));
  });

  // 轉發請求數據
  req.pipe(proxyReq);
});

// 啟動服務器
server.listen(PORT, () => {
  console.log(`代理服務器運行在 http://localhost:${PORT}` );
  console.log(`代理目標: ${TARGET_URL}`);
  console.log('按 Ctrl+C 停止服務器');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n正在關閉代理服務器...');
  server.close(() => {
    console.log('代理服務器已關閉');
    process.exit(0);
  });
});
