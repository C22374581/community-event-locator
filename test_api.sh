#!/bin/bash
# Bash script to test API endpoints
# Usage: ./test_api.sh [base_url]

BASE_URL="${1:-http://localhost:8000}"

echo "=== Testing Community Event Locator API ==="
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Health Endpoint
echo -e "${YELLOW}1. Testing Health Endpoint...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
    echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
fi
echo ""

# Test Events API
echo -e "${YELLOW}2. Testing Events API...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/events/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    count=$(echo "$body" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('count', len(data.get('results', []))))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✓ Events API working (Found $count events)${NC}"
else
    echo -e "${RED}✗ Events API failed (HTTP $http_code)${NC}"
fi
echo ""

# Test Nearby Events
echo -e "${YELLOW}3. Testing Nearby Events...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/events/nearby/?lat=53.3498&lng=-6.2603&radius=1500")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    count=$(echo "$body" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✓ Nearby events API working (Found $count events)${NC}"
else
    echo -e "${RED}✗ Nearby events API failed (HTTP $http_code)${NC}"
fi
echo ""

# Test Routes API
echo -e "${YELLOW}4. Testing Routes API...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/routes/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    count=$(echo "$body" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('features', [])))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✓ Routes API working (Found $count routes)${NC}"
else
    echo -e "${RED}✗ Routes API failed (HTTP $http_code)${NC}"
fi
echo ""

# Test Neighborhoods API
echo -e "${YELLOW}5. Testing Neighborhoods API...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/neighborhoods/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    count=$(echo "$body" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('features', [])))" 2>/dev/null || echo "?")
    echo -e "${GREEN}✓ Neighborhoods API working (Found $count neighborhoods)${NC}"
else
    echo -e "${RED}✗ Neighborhoods API failed (HTTP $http_code)${NC}"
fi
echo ""

# Test Manifest
echo -e "${YELLOW}6. Testing PWA Manifest...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/manifest.json")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Manifest.json accessible${NC}"
else
    echo -e "${RED}✗ Manifest.json not found (HTTP $http_code)${NC}"
fi
echo ""

# Test Service Worker
echo -e "${YELLOW}7. Testing Service Worker...${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/static/service-worker.js")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Service Worker accessible${NC}"
else
    echo -e "${RED}✗ Service Worker not found (HTTP $http_code)${NC}"
fi
echo ""

echo -e "${GREEN}=== Testing Complete ===${NC}"

