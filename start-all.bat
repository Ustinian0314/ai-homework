@echo off
echo 啟動AI Workspace完整系統...
echo.

echo 1. 安裝依賴包...
call npm install
if %errorlevel% neq 0 (
    echo 依賴安裝失敗！
    pause
    exit /b 1
)

echo.
echo 2. 啟動用戶API服務 (端口3001)...
start "User API" cmd /k "node user-api.js"

echo.
echo 3. 等待API服務啟動...
timeout /t 3 /nobreak > nul

echo.
echo 4. 啟動代理服務 (端口3000)...
start "Proxy Server" cmd /k "node proxy-server.js"

echo.
echo 5. 等待代理服務啟動...
timeout /t 3 /nobreak > nul

echo.
echo 6. 打開瀏覽器...
start http://localhost:3000

echo.
echo 所有服務已啟動！
echo - 前端: http://localhost:3000
echo - 用戶API: http://localhost:3001
echo - 代理服務: http://localhost:3000
echo.
echo 按任意鍵關閉此窗口...
pause > nul
