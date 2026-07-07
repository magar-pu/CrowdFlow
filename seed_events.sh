#!/bin/bash
set -e

# Configuration
API_URL="http://localhost"
EMAIL="super-admin@crowdflow.my.id"
PASSWORD='AdminSuperWKWK01$$$'

# Custom Image URL config - replace this value with your own URL later
IMAGE_URL1="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop"
IMAGE_URL2="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=800&auto=format&fit=crop"
IMAGE_URL3="image.png"


echo "🔐 1. Authenticating as Super Admin ($EMAIL)..."
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

# Helper function to send the creation requests
create_event() {
  local event_data="$1"
  local title=$(echo "$event_data" | grep -o '"title": "[^"]*' | cut -d'"' -f4)
  
  echo "🚀 Seeding Event: '$title'..."
  # Omit form file upload, pass cover_image_url in JSON metadata
  curl -s -X POST "$API_URL/api/events" \
    -H "Cookie: access_token=$ACCESS_TOKEN; csrf_token=$CSRF_TOKEN" \
    -H "X-CSRF-Token: $CSRF_TOKEN" \
    -F "event_data=$event_data" \
    -o response.json
  
  # Check if response indicates success
  if grep -q "event_id" response.json; then
      echo "  └─ ✅ Successfully created!"
  else
      echo "  └─ ❌ Failed! Response:"
      cat response.json
  fi
}

echo -e "\n🌱 Starting Event Seeding via Go API with custom Image URL...\n"

# ====================================================
# Event 1: Taylor Swift - The Eras Tour
# ====================================================
create_event '{
  "venue_id": 1,
  "organizer_id": 15,
  "event_type_id": 1,
  "title": "Taylor Swift: The Eras Tour Jakarta",
  "description": "Experience the monumental tour live in Jakarta with a state-of-the-art stage setup.",
  "starts_at": "2026-10-15T19:00:00Z",
  "ends_at": "2026-10-15T22:30:00Z",
  "entertainment_tax_rate": 15.00,
  "entertainment_tax_passed_to_buyer": true,
  "status": "approved",
  "cover_image_url": "'"$IMAGE_URL1"'"
}'

# ====================================================
# Event 2: Java Jazz Festival 2026
# ====================================================
create_event '{
  "venue_id": 2,
  "organizer_id": 15,
  "event_type_id": 2,
  "title": "Java Jazz Festival 2026",
  "description": "Three days of incredible jazz music featuring global legends and local masterminds.",
  "starts_at": "2026-11-20T16:00:00Z",
  "ends_at": "2026-11-22T23:59:59Z",
  "entertainment_tax_rate": 10.00,
  "entertainment_tax_passed_to_buyer": false,
  "status": "approved",
  "cover_image_url": "'"$IMAGE_URL2"'"
}'

# ====================================================
# Event 3: Prambanan Jazz Festival 2026
# ====================================================
create_event '{
  "venue_id": 3,
  "organizer_id": 15,
  "event_type_id": 1,
  "title": "Prambanan Jazz Festival 2026",
  "description": "Witness music under the stars with the majestic Prambanan temple as the backdrop.",
  "starts_at": "2026-09-05T17:00:00Z",
  "ends_at": "2026-09-05T23:00:00Z",
  "entertainment_tax_rate": 10.00,
  "entertainment_tax_passed_to_buyer": true,
  "status": "approved",
  "cover_image_url": "'"$IMAGE_URL3"'"
}'

# Clean up
rm -f response.json
echo -e "\n🎉 Seeding finished successfully!"
