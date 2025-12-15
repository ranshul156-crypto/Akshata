#!/bin/bash

# Comprehensive test runner for the application
# Runs RLS tests, integration tests, and prediction tests

set -e

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"

echo "========================================"
echo "Running All Tests"
echo "========================================"
echo ""

echo "1. Running RLS Tests..."
echo "----------------------------------------"
psql "$DB_URL" -f supabase/test_rls.sql
echo ""

echo "2. Running Integration Tests..."
echo "----------------------------------------"
psql "$DB_URL" -f supabase/integration_tests.sql
echo ""

echo "3. Running Prediction Tests..."
echo "----------------------------------------"
psql "$DB_URL" -f supabase/test_predictions.sql
echo ""

echo "4. Testing Prediction Algorithm (if Deno is available)..."
echo "----------------------------------------"
if command -v deno &> /dev/null; then
  deno run --allow-read utils/prediction-algorithm.test.ts
else
  echo "⚠️  Deno not installed. Skipping algorithm tests."
  echo "   Install Deno from: https://deno.land/"
fi
echo ""

echo "========================================"
echo "✅ All Tests Completed!"
echo "========================================"
