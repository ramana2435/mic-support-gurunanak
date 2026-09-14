#!/bin/bash

echo "================================"
echo "Live Translation App - Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL CLI not found. Make sure PostgreSQL is installed and running."
else
    echo "✅ PostgreSQL found: $(psql --version)"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building shared package..."
cd packages/shared
npm run build
cd ../..

echo ""
echo "Creating logs directory..."
mkdir -p apps/backend/logs

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running"
echo "2. Create database: createdb live_translation"
echo "3. Update apps/backend/.env with your database credentials"
echo "4. Run: npm run dev"
echo ""
echo "Then open:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:3001"
echo ""
