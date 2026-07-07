#!/bin/bash
set -e

# Configuration
API_URL="http://localhost"
EMAIL="super-admin@crowdflow.my.id"
PASSWORD='AdminSuperWKWK01$$$'
IMAGE_PATH="banner.png"

# 1. Create a temporary dummy image if it doesn't exist
if [ ! -f "$IMAGE_PATH" ]; then
    echo "Creating temporary test image with PNG magic bytes..."
    printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' > "$IMAGE_PATH"
    echo "dummy-image-data-here" >> "$IMAGE_PATH"
fi

echo "🔐 1. Authenticating as Organizer ($EMAIL)..."
# Perform login and dump response headers (-D -) to capture the set cookies
LOGIN_HEADERS=$(curl -s -D - -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}" \
  -o /dev/null)

ACCESS_TOKEN=$(echo "$LOGIN_HEADERS" | grep -Fi "set-cookie: access_token=" | sed -n 's/.*access_token=\([^;]*\).*/\1/p' | tr -d '\r')
CSRF_TOKEN=$(echo "$LOGIN_HEADERS" | grep -Fi "set-cookie: csrf_token=" | sed -n 's/.*csrf_token=\([^;]*\).*/\1/p' | tr -d '\r')

if [ -z "$ACCESS_TOKEN" ] || [ -z "$CSRF_TOKEN" ]; then
    echo "❌ Failed to retrieve authentication tokens. Check your credentials."
    exit 1
fi
echo "✅ Logged in successfully. (Tokens stored in-memory)"

echo "🚀 2. Creating Event and uploading image to MinIO..."
# Send the cookies in the standard Cookie header
curl -X POST "$API_URL/api/events" \
  -H "Cookie: access_token=$ACCESS_TOKEN; csrf_token=$CSRF_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "cover_image=@$IMAGE_PATH" \
  -F "event_data={
    \"venue_id\": 1,
    \"organizer_id\": 15,
    \"event_type_id\": 1,
    \"title\": \"In-Memory Event via Bash Curl - Drafted\",
    \"description\": \"An event uploaded using memory-only tokens.\",
    \"starts_at\": \"2026-10-15T19:00:00Z\",
    \"ends_at\": \"2026-10-15T22:30:00Z\",
    \"entertainment_tax_rate\": 15.00,
    \"entertainment_tax_passed_to_buyer\": true,
    \"status\": \"draft\"
  }"

# Clean up local dummy image
rm -f "$IMAGE_PATH"
echo -e "\n\n🎉 Done!"