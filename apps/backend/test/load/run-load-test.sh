#!/bin/bash

# Load Testing Runner Script
# Module 12: Scalability Testing

set -e

echo "=== Module 12 Load Testing ==="
echo ""

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:5000}"
SESSION_CODE="${SESSION_CODE:-TEST123}"

echo "Configuration:"
echo "  Server URL: $SERVER_URL"
echo "  Session Code: $SESSION_CODE"
echo ""

# Check if server is running
echo "Checking server availability..."
if ! curl -s -f "$SERVER_URL/api/health" > /dev/null; then
    echo "ERROR: Server is not available at $SERVER_URL"
    echo "Please start the backend server first: cd apps/backend && npm run dev"
    exit 1
fi

echo "Server is running ✓"
echo ""

# Create test session via API
echo "Creating test session..."
SESSION_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-organizer-token" \
  -d "{\"code\":\"$SESSION_CODE\",\"title\":\"Load Test Session\"}")

echo "Session created ✓"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules/socket.io-client" ]; then
    echo "Installing test dependencies..."
    npm install --no-save socket.io-client
fi

# Compile TypeScript
echo "Compiling load test..."
npx ts-node --transpile-only test/load/load-test.ts

echo ""
echo "=== Load Test Complete ==="
echo "Results saved to test/load/results.json"
