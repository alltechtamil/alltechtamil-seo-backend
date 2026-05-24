#!/bin/bash

# ==============================================================================
# Tag CRUD End-to-End Test Script
# Tests both Public (unauthenticated) and Private (authenticated) endpoints.
# Usage: bash src/scripts/test-tag-crud.sh
# ==============================================================================

BASE_URL="http://localhost:5000/api/v1"
ADMIN_EMAIL="admin@alltectamil.com"
ADMIN_PASSWORD="Admin@123"

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}      STARTING TAG CRUD E2E TESTS         ${NC}"
echo -e "${BLUE}==========================================${NC}"

# ------------------------------------------------------------------------------
# 0. Login to get Admin Token
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[0] Logging in as Admin to obtain JWT...${NC}"
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\", \"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed. Could not retrieve token. Check credentials or server status.${NC}"
  echo "$LOGIN_RESP" | jq
  exit 1
fi
echo -e "${GREEN}✅ Login successful. Token acquired.${NC}"


# ------------------------------------------------------------------------------
# 1. GET Tags (Public - No Token)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1] Testing Public GET /tags...${NC}"
curl -s "$BASE_URL/tags" | jq


# ------------------------------------------------------------------------------
# 2. POST Tag (Public - Expect 401 Unauthorized)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2] Testing Unauthorized POST /tags (Expect 401)...${NC}"
curl -s -X POST "$BASE_URL/tags" \
  -H "Content-Type: application/json" \
  -d '{"name": "ReactJS"}' | jq


# ------------------------------------------------------------------------------
# 3. POST Tag (Admin - With Token)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3] Testing Authorized POST /tags...${NC}"
CREATE_RESP=$(curl -s -X POST "$BASE_URL/tags" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "ReactJS", "description": "React framework"}')

echo "$CREATE_RESP" | jq
TAG_ID=$(echo "$CREATE_RESP" | jq -r '.data.id')

if [ "$TAG_ID" == "null" ] || [ -z "$TAG_ID" ]; then
  echo -e "${RED}❌ Tag creation failed.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Tag created with ID: $TAG_ID${NC}"


# ------------------------------------------------------------------------------
# 4. PUT Tag (Admin - With Token)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4] Testing Authorized PUT /tags/$TAG_ID...${NC}"
curl -s -X PUT "$BASE_URL/tags/$TAG_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "React.js Framework"}' | jq


# ------------------------------------------------------------------------------
# 5. GET Tag by Slug (Public - No Token)
# ------------------------------------------------------------------------------
# Validates that the auto-slug generator updated 'ReactJS' to 'reactjs-framework'
echo -e "\n${BLUE}[5] Testing Public GET /tags/:slug...${NC}"
curl -s "$BASE_URL/tags/reactjs-framework" | jq


# ------------------------------------------------------------------------------
# 6. DELETE Tag (Admin - With Token)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[6] Testing Authorized DELETE /tags/$TAG_ID...${NC}"
curl -s -X DELETE "$BASE_URL/tags/$TAG_ID" \
  -H "Authorization: Bearer $TOKEN" | jq


# ------------------------------------------------------------------------------
# 7. Verify Deletion (Public - No Token - Expect 404)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[7] Verifying Tag Deletion (Expect 404)...${NC}"
curl -s "$BASE_URL/tags/reactjs-framework" | jq

echo -e "\n${GREEN}🎉 Tag CRUD Testing Complete!${NC}"
