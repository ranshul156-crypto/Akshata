#!/bin/bash

# Script to manually trigger predictions for all users or a specific user
# Usage:
#   ./scripts/run-predictions.sh              # Run for all users
#   ./scripts/run-predictions.sh <user_id>    # Run for specific user

set -e

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"

echo "========================================"
echo "Prediction Runner"
echo "========================================"
echo ""

if [ -z "$1" ]; then
  echo "Running predictions for ALL users..."
  echo ""
  
  psql "$DB_URL" <<EOF
SELECT 
  user_id,
  status,
  message
FROM run_all_user_predictions();
EOF

  echo ""
  echo "✅ Completed batch prediction run"
  
else
  USER_ID="$1"
  echo "Running prediction for user: $USER_ID"
  echo ""
  
  psql "$DB_URL" <<EOF
SELECT trigger_user_prediction('$USER_ID'::UUID);
EOF

  echo ""
  echo "✅ Triggered prediction for user $USER_ID"
fi

echo ""
echo "View predictions:"
echo "  psql $DB_URL -c \"SELECT * FROM predictions ORDER BY prediction_date DESC LIMIT 10;\""
echo ""
