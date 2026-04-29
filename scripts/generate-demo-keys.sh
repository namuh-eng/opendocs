#!/bin/bash
# Generate demo API keys for hackathon distribution
# Usage: ./scripts/generate-demo-keys.sh [count] [api-url]
set -euo pipefail

COUNT="${1:-20}"
API_URL="${2:-http://127.0.0.1:3002}"
if [ -z "${DASHBOARD_KEY:-}" ]; then
  echo "DASHBOARD_KEY must be set explicitly for local demo-key generation." >&2
  exit 1
fi
if [ "${ALLOW_DEMO_KEY_GENERATION:-}" != "local-only" ]; then
  echo "Set ALLOW_DEMO_KEY_GENERATION=local-only to confirm this is a local-only demo operation." >&2
  exit 1
fi
MASTER_KEY="$DASHBOARD_KEY"

echo "=== Generating $COUNT demo API keys ==="
echo "API: $API_URL"
echo ""
echo "Key,Name,Permission"

for i in $(seq 1 $COUNT); do
  NAME="demo-$i"
  RESULT=$(node -e "
    fetch('${API_URL}/api/api-keys', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Authorization':'Bearer ${MASTER_KEY}'},
      body: JSON.stringify({name:'${NAME}',permission:'read'})
    }).then(r=>r.json()).then(d=>console.log(JSON.stringify(d))).catch(e=>console.error(e))
  " 2>&1)

  TOKEN=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token','ERROR'))" 2>/dev/null || echo "ERROR")

  if [ "$TOKEN" != "ERROR" ]; then
    echo "$TOKEN,$NAME,read"
  else
    echo "FAILED,$NAME,error: $RESULT"
  fi
done

echo ""
echo "=== Done. Distribute keys to demo attendees. ==="
echo "Each key is generated with read permission only."
