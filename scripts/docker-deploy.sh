#!/bin/bash

# =============================================================================
# Open Scouts - Docker Deployment Script
# =============================================================================
# Quick deployment script for Docker
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  Open Scouts - Docker Deployment"
echo "=================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}.env file created${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Please edit .env and configure your environment variables${NC}"
        echo "Required variables:"
        echo "  - NEXT_PUBLIC_SUPABASE_URL"
        echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
        echo "  - SUPABASE_SERVICE_ROLE_KEY"
        echo "  - DATABASE_URL"
        echo "  - OPENAI_API_KEY"
        echo "  - FIRECRAWL_API_KEY"
        echo ""
        read -p "Press Enter after you've configured .env, or Ctrl+C to exit..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Verify required environment variables
echo "Checking environment variables..."
source .env

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "FIRECRAWL_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please configure these variables in .env"
    exit 1
fi

echo -e "${GREEN}✓ All required environment variables are set${NC}"
echo ""

# Ask for deployment mode
echo "Select deployment mode:"
echo "1) Production (optimized build)"
echo "2) Development (hot reload)"
read -p "Enter choice [1-2]: " mode

case $mode in
    1)
        echo ""
        echo "Deploying in PRODUCTION mode..."
        echo ""

        # Build and start production
        docker compose down 2>/dev/null || true
        docker compose build --no-cache
        docker compose up -d

        echo ""
        echo -e "${GREEN}✓ Production deployment complete!${NC}"
        echo ""
        echo "Application is running at: http://localhost:3000"
        echo ""
        echo "Useful commands:"
        echo "  View logs:        docker compose logs -f"
        echo "  Stop:             docker compose down"
        echo "  Restart:          docker compose restart"
        echo "  View status:      docker compose ps"
        ;;
    2)
        echo ""
        echo "Deploying in DEVELOPMENT mode..."
        echo ""

        # Build and start development
        docker compose -f docker-compose.dev.yml down 2>/dev/null || true
        docker compose -f docker-compose.dev.yml build --no-cache
        docker compose -f docker-compose.dev.yml up
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
