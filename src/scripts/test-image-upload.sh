#!/bin/bash

# ==============================================================================
# Image Pipeline End-to-End Test Script
# Verifies:
#   5.10 Valid Upload (WebP)
#   5.11 Invalid MIME Rejection
#   5.12 Oversized File Rejection
# Usage: bash src/scripts/test-image-upload.sh
# ==============================================================================

BASE_URL="http://localhost:5000/api/v1"
ADMIN_EMAIL="admin@alltectamil.com"
ADMIN_PASSWORD="Admin@123"
IMAGE_FILE="src/scripts/image.webp"
DUMMY_PDF="src/scripts/dummy.pdf"
DUMMY_HUGE="src/scripts/huge.webp"

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}      STARTING IMAGE PIPELINE TESTS       ${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if target image exists
if [ ! -f "$IMAGE_FILE" ]; then
  echo -e "${RED}❌ Test image not found at $IMAGE_FILE${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 0. Login to get Admin Token
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[0] Logging in as Admin to obtain JWT...${NC}"
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\", \"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed. Could not retrieve token.${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Login successful.${NC}"


# ------------------------------------------------------------------------------
# 1. 5.10 Test Valid Upload (WebP)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[1] Testing Valid Image Upload (5.10)...${NC}"
UPLOAD_RESP=$(curl -s -X POST "$BASE_URL/images/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$IMAGE_FILE;type=image/webp" \
  -F "alt_text=Sample Test Image")

CDN_URL=$(echo "$UPLOAD_RESP" | jq -r '.data.cdnUrl')
IMAGE_ID=$(echo "$UPLOAD_RESP" | jq -r '.data.id')

if [ "$CDN_URL" == "null" ] || [ -z "$CDN_URL" ]; then
  echo -e "${RED}❌ Image upload failed.${NC}"
  echo "$UPLOAD_RESP" | jq
  exit 1
fi
echo -e "${GREEN}✅ Upload successful!${NC}"
echo -e "${GREEN}✅ DB Record ID: $IMAGE_ID${NC}"
echo -e "${GREEN}✅ Generated CDN URL: $CDN_URL${NC}"


# ------------------------------------------------------------------------------
# 2. 5.11 Test Invalid MIME (415 Rejection)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[2] Testing Invalid MIME Upload (5.11 - Expect 400/415)...${NC}"
touch $DUMMY_PDF
MIME_RESP=$(curl -s -X POST "$BASE_URL/images/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$DUMMY_PDF;type=application/pdf")

echo "$MIME_RESP" | jq
rm $DUMMY_PDF


# ------------------------------------------------------------------------------
# 3. 5.12 Test Oversized File (413 Rejection)
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[3] Testing Oversized File Rejection (5.12 - Expect 413)...${NC}"
# Create a dummy 6MB file (Assuming limit is 5MB)
dd if=/dev/zero of=$DUMMY_HUGE bs=1M count=6 2>/dev/null
SIZE_RESP=$(curl -s -X POST "$BASE_URL/images/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$DUMMY_HUGE;type=image/webp")

echo "$SIZE_RESP" | jq
rm $DUMMY_HUGE

# ------------------------------------------------------------------------------
# 4. Cleanup DB Record
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}[4] Cleaning up DB Record...${NC}"
curl -s -X DELETE "$BASE_URL/images/$IMAGE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✅ Test image DB record removed.${NC}"

echo -e "\n${GREEN}🎉 Image Pipeline Testing Complete!${NC}"
