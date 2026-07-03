#!/bin/bash
HEALTH_URL="${1:-https://evalassist.onrender.com/api/auth/health}"

echo "Pinging EvalAssist to keep it awake..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL")

if [ "$HTTP_CODE" = "200" ]; then
  echo "[OK] Backend responded. App is alive."
elif [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "000" ]; then
  echo "[COLD] Backend is waking up (got $HTTP_CODE). It'll be ready in 30-60s."
else
  echo "[?] Unexpected status: $HTTP_CODE"
fi
