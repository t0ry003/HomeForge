#!/usr/bin/env bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🛡️  Checking for vulnerabilities..."
npm audit fix || true

echo "🚀 Starting development server..."
npm run dev
