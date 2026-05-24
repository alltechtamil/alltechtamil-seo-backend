#!/bin/bash

# Configuration
API_URL="http://localhost:5000/api/v1/public"

echo "=============================================="
echo "    PUBLIC API LAYER VERIFICATION SCRIPT     "
echo "=============================================="

# 1. Test /public/blogs (Feed endpoint)
echo -e "\n[1] Testing GET /public/blogs..."
FEED_RESPONSE=$(curl -s "$API_URL/blogs")
# Extract a slug from the first blog in the response for subsequent tests
FIRST_BLOG_SLUG=$(echo $FEED_RESPONSE | jq -r '.data[0].slug // empty')

echo "Total blogs returned: $(echo $FEED_RESPONSE | jq '.data | length')"
echo "ContentHtml in feed (should be null/empty): $(echo $FEED_RESPONSE | jq -r '.data[0].contentHtml')"
echo "Blog status in feed (should be 'published'): $(echo $FEED_RESPONSE | jq -r '.data[0].status')"

# 2. Test /public/blogs/:slug (Article endpoint)
if [ -z "$FIRST_BLOG_SLUG" ]; then
    echo "⚠️  No published blogs found. Please publish a blog via Admin API to fully test."
else
    echo -e "\n[2] Testing GET /public/blogs/$FIRST_BLOG_SLUG..."
    ARTICLE_RESPONSE=$(curl -s "$API_URL/blogs/$FIRST_BLOG_SLUG")
    echo "Blog Title: $(echo $ARTICLE_RESPONSE | jq -r '.data.title')"
    echo "ContentHtml length: $(echo $ARTICLE_RESPONSE | jq -r '.data.contentHtml | length')"
    echo "SEO Title: $(echo $ARTICLE_RESPONSE | jq -r '.data.seoTitle')"
fi

# 3. Test /public/search
echo -e "\n[3] Testing GET /public/search?q=a..."
SEARCH_RESPONSE=$(curl -s "$API_URL/search?q=a")
echo "Search results count: $(echo $SEARCH_RESPONSE | jq '.data | length')"

# 4. Test /public/search/category/:slug
# Fetching categories from the feed to get a valid category slug
CATEGORY_SLUG=$(echo $FEED_RESPONSE | jq -r '.data[0].category.slug // empty')
if [ -n "$CATEGORY_SLUG" ]; then
    echo -e "\n[4] Testing GET /public/search/category/$CATEGORY_SLUG..."
    CATEGORY_RESPONSE=$(curl -s "$API_URL/search/category/$CATEGORY_SLUG")
    echo "Category blogs count: $(echo $CATEGORY_RESPONSE | jq '.data | length')"
fi

# 5. Test /public/search/tag/:slug
TAG_SLUG=$(echo $FEED_RESPONSE | jq -r '.data[0].tags[0].slug // empty')
if [ -n "$TAG_SLUG" ]; then
    echo -e "\n[5] Testing GET /public/search/tag/$TAG_SLUG..."
    TAG_RESPONSE=$(curl -s "$API_URL/search/tag/$TAG_SLUG")
    echo "Tag blogs count: $(echo $TAG_RESPONSE | jq '.data | length')"
fi

echo -e "\nDone."
