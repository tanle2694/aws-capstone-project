#!/bin/sh
cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  VITE_API_BASE: "${VITE_API_BASE:-http://localhost:8000}",
  VITE_API_KEY: "${VITE_API_KEY:-}"
};
EOF
exec nginx -g "daemon off;"
