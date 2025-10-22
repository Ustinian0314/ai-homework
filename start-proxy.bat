@echo off
echo 啟動 Ollama 代理服務器...
echo.
echo 代理服務器將在 http://localhost:3000 運行
echo 目標服務器: https://e55fb4afe884.ngrok-free.app
echo.
echo 按 Ctrl+C 停止服務器
echo.
node proxy-server.js
pause

