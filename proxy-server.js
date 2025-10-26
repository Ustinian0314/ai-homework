server {
  # 監聽埠號
  listen 8085;
  listen [::]:8085;

  # 伺服器名稱
  server_name 150.5.160.10;
  
  # 允許較大的客戶端請求頭緩衝區
  large_client_header_buffers 4 32k;

  # ------------------------------------------------
  # 1. CORS 處理 (設置為全局，應用於所有請求)
  # ------------------------------------------------
  add_header 'Access-Control-Allow-Origin' '*' always;
  add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
  add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, ngrok-skip-browser-warning' always;
  add_header 'Access-Control-Max-Age' '86400' always;

  # 處理 OPTIONS 預檢請求
  if ($request_method = 'OPTIONS') {
      return 204; 
  }

  # ------------------------------------------------
  # 2. 用戶 API 服務代理 (User API: /api/register, /api/login, /api/chat/list 等)
  # ------------------------------------------------
  # 匹配所有以 /api/ 開頭的請求，並將其轉發到 User API 服務
  location /api {
      # 將請求轉發到 VM 內部運行的 User API 服務 (user-api.js 監聽的埠)
      proxy_pass http://localhost:3001; 
      
      # 標準代理標頭
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      
      # 確保 Nginx 不緩衝代理響應
      proxy_buffering off;
      
      # 隱藏目標服務器可能返回的 CORS 標頭 ，確保使用我們在頂部設置的全局標頭
      proxy_hide_header Access-Control-Allow-Origin;
      proxy_hide_header Access-Control-Allow-Methods;
      proxy_hide_header Access-Control-Allow-Headers;
      proxy_hide_header Access-Control-Max-Age;
  }
  
  # ------------------------------------------------
  # 3. AI 對話服務代理 (AI Chat: /api/chat)
  # ------------------------------------------------
  # 由於您的 AI 對話服務的請求路徑也是 /api/chat，我們需要確保它被精確匹配並轉發到 ngrok
  # 這裡使用 location ~ ^/api/chat 來確保 /api/chat/xxx 的請求優先被這個區塊處理
  location ~ ^/api/chat {
      # 代理到您的目標 URL (https://d7115248324e.ngrok-free.app )
      proxy_pass https://d7115248324e.ngrok-free.app; 
      
      # 設置代理標頭
      proxy_set_header Host d7115248324e.ngrok-free.app; # 設置目標伺服器需要的 Host
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      
      # 添加 ngrok-skip-browser-warning 標頭
      proxy_set_header ngrok-skip-browser-warning true;
      
      # 確保 Nginx 不緩衝代理響應
      proxy_buffering off;
      
      # 隱藏目標服務器可能返回的 CORS 標頭
      proxy_hide_header Access-Control-Allow-Origin;
      proxy_hide_header Access-Control-Allow-Methods;
      proxy_hide_header Access-Control-Allow-Headers;
      proxy_hide_header Access-Control-Max-Age;
  }

  # ------------------------------------------------
  # 4. 靜態檔案服務 (服務 HTML/CSS/JS)
  # ------------------------------------------------
  # 精確匹配根路徑 /，並使用 try_files 確保找到檔案
  location = / {
      root /home/ubuntu/proxy-app; 
      try_files /redesigned_AI.html =404;
  }
  
  # 匹配所有靜態檔案 (CSS, JS, 圖片)
  location ~ \.(css|js|png|jpg|jpeg|gif|ico)$ {
      root /home/ubuntu/proxy-app;
      expires 30d;
  }

}
