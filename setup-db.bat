@echo off
echo.
echo  Configurando banco de dados PostgreSQL...
echo.

set PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin
set PGPASSWORD=comercialy_secret_2024
set PGUSER=postgres
set PGHOST=localhost
set PGPORT=5432

echo [1/3] Criando usuario comercialy_user...
psql -U postgres -h localhost -c "CREATE USER comercialy_user WITH PASSWORD 'comercialy_secret_2024';" 2>/dev/null

echo [2/3] Criando banco de dados comercialy...
psql -U postgres -h localhost -c "CREATE DATABASE comercialy OWNER comercialy_user;" 2>/dev/null

echo [3/3] Rodando migration SQL...
psql -U comercialy_user -h localhost -d comercialy -f backend\src\database\migrations\init.sql

if %errorlevel% == 0 (
    echo.
    echo  Banco configurado com sucesso!
    echo  Agora execute: start.bat
) else (
    echo.
    echo  [ERRO] Falha na migration.
)
echo.
pause
