#!/bin/sh
# Health check script for Docker container

# Use localhost since Next.js should bind to 0.0.0.0
curl -f http://localhost:3000/api/health || exit 1
