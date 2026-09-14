@echo off
echo ========================================
echo Clean Installation Script
echo ========================================
echo.

echo Step 1: Installing root dependencies...
cd /d "%~dp0"
call npm install concurrently --save-dev
if errorlevel 1 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)
echo Root dependencies installed!
echo.

echo Step 2: Building shared package...
cd packages\shared
call npm install
call npm run build
cd ..\..
echo Shared package built!
echo.

echo Step 3: Installing backend dependencies...
cd apps\backend
call npm install pg dotenv winston express cors socket.io joi uuid qrcode jsonwebtoken nodemon ts-node typescript @types/node @types/express @types/pg @types/cors @types/jsonwebtoken @types/uuid @types/qrcode
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo Backend dependencies installed!
echo.

echo Step 4: Installing frontend dependencies...
cd ..\frontend
call npm install next react react-dom socket.io-client zustand qrcode.react @types/react @types/node typescript
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)
echo Frontend dependencies installed!
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo You can now run:
echo   Backend:  cd apps\backend ^&^& npm run dev
echo   Frontend: cd apps\frontend ^&^& npm run dev
echo.
pause
