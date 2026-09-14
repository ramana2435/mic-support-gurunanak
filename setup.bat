@echo off
echo ================================
echo Live Translation App - Setup
echo ================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

for /f "delims=" %%i in ('node -v') do set NODE_VERSION=%%i
echo √ Node.js version: %NODE_VERSION%

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed.
    exit /b 1
)

for /f "delims=" %%i in ('npm -v') do set NPM_VERSION=%%i
echo √ npm version: %NPM_VERSION%

REM Check PostgreSQL
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ! PostgreSQL CLI not found. Make sure PostgreSQL is installed and running.
) else (
    echo √ PostgreSQL found
)

echo.
echo Installing dependencies...
call npm install

echo.
echo Building shared package...
cd packages\shared
call npm run build
cd ..\..

echo.
echo Creating logs directory...
if not exist "apps\backend\logs" mkdir "apps\backend\logs"

echo.
echo ================================
echo √ Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Make sure PostgreSQL is running
echo 2. Create database: createdb live_translation
echo 3. Update apps\backend\.env with your database credentials
echo 4. Run: npm run dev
echo.
echo Then open:
echo   - Frontend: http://localhost:3000
echo   - Backend API: http://localhost:3001
echo.
pause
