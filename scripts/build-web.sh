#!/bin/bash
# Build script for Expo web deployment

set -e

echo "🚀 Building Expo web application..."

# Export web build
npx expo export:web

echo "✅ Web build completed successfully!"
echo "📦 Build output is in the 'web-build' directory"
