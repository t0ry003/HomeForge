#!/usr/bin/env bash
# =============================================================================
# MONOREPO DEVELOPMENT SCRIPT
# =============================================================================
# Starts development servers for the entire HomeForge project
# Works on Windows (WSL), Mac, and Linux
#
# Usage:
#   ./dev.sh              # Start both frontend & backend
#   ./dev.sh backend      # Backend only
#   ./dev.sh frontend     # Frontend only

set -eu

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${1:-all}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC}  $*"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $*"
}

log_error() {
    echo -e "${RED}✗${NC}  $*"
    exit 1
}

# ============================================================================
# Start Backend
# ============================================================================

start_backend() {
    log_info "Starting Backend Server..."
    
    if [ ! -d "$SCRIPT_DIR/backend" ]; then
        log_error "Backend folder not found at $SCRIPT_DIR/backend"
    fi
    
    cd "$SCRIPT_DIR/backend" || exit 1
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        log_error "Backend virtual environment not found. Run './setup.sh backend' first"
    fi
    
    # Activate virtual environment
    # shellcheck source=/dev/null
    source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
    
    log_info "Backend server starting at http://localhost:8000"
    log_info "Press Ctrl+C to stop"
    echo ""
    
    python manage.py runserver 0.0.0.0:8000
}

# ============================================================================
# Start Frontend
# ============================================================================

start_frontend() {
    log_info "Starting Frontend Server..."
    
    if [ ! -d "$SCRIPT_DIR/frontend" ]; then
        log_error "Frontend folder not found at $SCRIPT_DIR/frontend"
    fi
    
    cd "$SCRIPT_DIR/frontend" || exit 1
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_error "Frontend dependencies not found. Run './setup.sh frontend' first"
    fi
    
    log_info "Frontend server starting at http://localhost:3000"
    log_info "Press Ctrl+C to stop"
    echo ""
    
    npm run dev || npm start
}

# ============================================================================
# Start Both (Parallel)
# ============================================================================

start_both() {
    log_info "Starting both servers in parallel..."
    echo ""
    
    # Start backend in background
    (start_backend) &
    BACKEND_PID=$!
    
    # Give backend time to start
    sleep 3
    
    # Start frontend (in foreground, so Ctrl+C stops the script)
    (start_frontend) &
    FRONTEND_PID=$!
    
    log_success "Both servers running!"
    log_info "Backend:  http://localhost:8000"
    log_info "Frontend: http://localhost:3000"
    log_info "Press Ctrl+C to stop all servers"
    echo ""
    
    # Wait for both processes
    wait
}

# ============================================================================
# Main
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         🏠 HomeForge Development Server                           ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

case "$TARGET" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        start_both
        ;;
    *)
        log_error "Unknown target: $TARGET. Use 'backend', 'frontend', or 'all'"
        ;;
esac
