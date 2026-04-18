@echo off
chcp 65001 >nul
echo ======================================
echo   AI Board Server Starter
echo ======================================
echo.

:: Kill existing Node processes
echo Stopping any existing servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Create logs directory if not exists
if not exist logs mkdir logs

echo.
echo Starting Next.js frontend...
echo ======================================
start "Next.js Frontend" cmd /c "npx next dev 2>&1 | tee logs/next.log"

timeout /t 3 /nobreak >nul

echo.
echo Starting WebSocket backend...
echo ======================================
start "WebSocket Backend" cmd /c "npx ts-node --project tsconfig.server.json server/index.ts 2>&1 | tee logs/server.log"

timeout /t 5 /nobreak >nul

echo.
echo ======================================
echo   Servers Started Successfully!
echo ======================================
echo.
echo   Frontend:  http://localhost:3000
echo   Admin:     http://localhost:3000/admin
echo   WebSocket: ws://localhost:3001
echo.
echo   Logs saved in: logs/
echo.
echo Press any key to stop servers...
pause >nul

echo.
echo Stopping servers...
taskkill /F /IM node.exe 2>nul
echo Servers stopped.
echo.
pause
