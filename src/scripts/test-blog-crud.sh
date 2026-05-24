#!/bin/bash

# ==============================================================================
# Blog CRUD End-to-End Test Script
# Verifies:
#   4.16 Blog CRUD operations & Status change
#   4.17 Slug auto-generation and uniqueness logic
#   4.18 HTML sanitization
#   4.19 Tag sync on blog update
# Usage: bash src/scripts/test-blog-crud.sh
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
echo -e "${BLUE}      STARTING BLOG CRUD E2E TESTS        ${NC}"
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
# 1. POST Blog (Create, Auto-slug, HTML Sanitization)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1] Testing Blog Creation (Sanitization & Auto-slug)...${NC}"
PAYLOAD=$(cat <<EOF
{
  "title": "Hack The Planet",
  "content_html": "<p>Safe content</p><script>alert('xss');</script><style>body {display: none;}</style>",
  "tags": ["cybersecurity", "web"]
}
EOF
)

CREATE_RESP=$(curl -s -X POST "$BASE_URL/blogs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PAYLOAD")

BLOG_ID=$(echo "$CREATE_RESP" | jq -r '.data.id')
CLEAN_HTML=$(echo "$CREATE_RESP" | jq -r '.data.contentHtml')
SLUG=$(echo "$CREATE_RESP" | jq -r '.data.slug')

if [ "$BLOG_ID" == "null" ] || [ -z "$BLOG_ID" ]; then
  echo -e "${RED}❌ Blog creation failed.${NC}"
  echo "$CREATE_RESP" | jq
  exit 1
fi

echo -e "${GREEN}✅ Blog created with ID: $BLOG_ID${NC}"
echo -e "${GREEN}✅ Slug auto-generated as: $SLUG${NC}"

# Verify Sanitization
if [[ "$CLEAN_HTML" == *"<script>"* ]] || [[ "$CLEAN_HTML" == *"<style>"* ]]; then
  echo -e "${RED}❌ HTML Sanitization FAILED. Malicious tags present.${NC}"
  echo "$CLEAN_HTML"
else
  echo -e "${GREEN}✅ HTML Sanitization SUCCESS. Malicious tags stripped: ${CLEAN_HTML}${NC}"
fi


# ------------------------------------------------------------------------------
# 2. POST Blog (Test Slug Uniqueness - Expect 409)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2] Testing Slug Uniqueness Conflict (Expect 409)...${NC}"
curl -s -X POST "$BASE_URL/blogs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$PAYLOAD" | jq


# ------------------------------------------------------------------------------
# 3. PUT Blog (Tag Sync & Update)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3] Testing Blog Update (Tag Sync)...${NC}"
UPDATE_PAYLOAD=$(cat <<EOF
{
  "title": "Clean The Planet",
  "tags": ["web", "frontend"]
}
EOF
)

UPDATE_RESP=$(curl -s -X PUT "$BASE_URL/blogs/$BLOG_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$UPDATE_PAYLOAD")

NEW_SLUG=$(echo "$UPDATE_RESP" | jq -r '.data.slug')
echo -e "${GREEN}✅ Blog updated. New auto-slug: $NEW_SLUG${NC}"


# Verify Tags Synced correctly
echo -e "\n${BLUE}[3.1] Verifying Tags synced to 'web' and 'frontend'...${NC}"
curl -s -X GET "$BASE_URL/blogs/$BLOG_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.Tags'


# ------------------------------------------------------------------------------
# 4. PATCH Blog Status & Verify Public Access
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4] Testing Blog Status Update to PUBLISHED...${NC}"
curl -s -X PATCH "$BASE_URL/blogs/$BLOG_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "published"}' | jq

echo -e "\n${BLUE}[4.1] Fetching PUBLISHED blog publicly via Slug...${NC}"
curl -s -X GET "$BASE_URL/blogs/slug/$NEW_SLUG" | jq '.status_code'


# ------------------------------------------------------------------------------
# 5. DELETE Blog
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[5] Testing Blog Deletion...${NC}"
curl -s -X DELETE "$BASE_URL/blogs/$BLOG_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n${BLUE}[5.1] Verifying Blog Deletion (Expect 404)...${NC}"
curl -s -X GET "$BASE_URL/blogs/$BLOG_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.status_code'

echo -e "\n${GREEN}🎉 Blog CRUD Testing Complete!${NC}"
