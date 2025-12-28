#!/bin/bash

# =============================================================================
# Environment Variables Checker
# =============================================================================
# Check if all required environment variables are loaded in Docker container
# =============================================================================

echo "=================================================="
echo "  Checking Environment Variables in Container"
echo "=================================================="
echo ""

# Check if container is running
if ! docker ps | grep -q open-scouts; then
    echo "Error: Container 'open-scouts' is not running"
    echo "Start it with: docker compose up -d"
    exit 1
fi

echo "Container is running. Checking environment variables..."
echo ""

# List of required variables
required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "FIRECRAWL_API_KEY"
)

# Optional variables
optional_vars=(
    "SUPABASE_ACCESS_TOKEN"
    "OPENAI_BASE_URL"
    "OPENAI_MODEL"
    "RESEND_API_KEY"
    "RESEND_FROM_EMAIL"
    "NEXT_PUBLIC_SITE_URL"
)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Required Variables:"
echo "-------------------"
all_set=true
for var in "${required_vars[@]}"; do
    value=$(docker compose exec -T app sh -c "echo \$$var" 2>/dev/null)
    if [ -z "$value" ] || [ "$value" == "" ]; then
        echo -e "${RED}✗ $var - NOT SET${NC}"
        all_set=false
    else
        # Mask sensitive values
        masked_value="${value:0:10}..."
        echo -e "${GREEN}✓ $var - SET ($masked_value)${NC}"
    fi
done

echo ""
echo "Optional Variables:"
echo "-------------------"
for var in "${optional_vars[@]}"; do
    value=$(docker compose exec -T app sh -c "echo \$$var" 2>/dev/null)
    if [ -z "$value" ] || [ "$value" == "" ]; then
        echo -e "${YELLOW}○ $var - NOT SET (optional)${NC}"
    else
        masked_value="${value:0:10}..."
        echo -e "${GREEN}✓ $var - SET ($masked_value)${NC}"
    fi
done

echo ""
if [ "$all_set" = true ]; then
    echo -e "${GREEN}✓ All required environment variables are set!${NC}"
else
    echo -e "${RED}✗ Some required environment variables are missing!${NC}"
    exit 1
fi
