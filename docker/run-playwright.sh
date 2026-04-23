#!/bin/bash
set -x  # optional: prints each command as it's run for debugging

cd /app/tests/playwright || exit 1
npx playwright test --reporter=html --max-failures=1 "$@"
