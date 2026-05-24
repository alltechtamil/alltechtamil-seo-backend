#!/bin/bash
BASE_URL="http://localhost:5000/api/v1"

echo "Logging in..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"admin@alltectamil.com\", \"password\":\"Admin@123\"}")
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.accessToken')

echo "Creating blog..."
PAYLOAD='{"title": "Public API Test Blog", "content_html": "<p>Content</p>", "tags": ["test"]}'
CREATE_RESP=$(curl -s -X POST "$BASE_URL/blogs" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$PAYLOAD")
BLOG_ID=$(echo "$CREATE_RESP" | jq -r '.data.id')

echo "Publishing blog $BLOG_ID..."
curl -s -X PATCH "$BASE_URL/blogs/$BLOG_ID/status" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"status": "published"}' > /dev/null

echo "Blog Published."
