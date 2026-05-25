@echo off
echo.
echo  =============================================
echo   Comercialy - Iniciando ambiente local
echo  =============================================
echo.

if not exist .env (
    echo [ERRO] Arquivo .env nao encontrado!
    pause & exit /b 1
)

echo [1/2] Iniciando Backend (porta 3001)...
start "Comercialy Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak > /dev/null

echo [2/2] Iniciando Dashboard (porta 3000)...
start "Comercialy Dashboard" cmd /k "cd /d %~dp0dashboard && npm run dev"

echo.
echo  Backend:   http://localhost:3001/health
echo  Dashboard: http://localhost:3000
echo.
pause > /dev/null
