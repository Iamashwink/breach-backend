#!/bin/sh
set -e

# 1. Apply database migrations
echo "==> [BreachPoint] Applying database migrations..."
bun run db:migrate

# 2. Import challenges and seed admin accounts
if [ "${AUTO_SEED:-true}" = "true" ]; then
  echo "==> [BreachPoint] Importing challenges into database..."
  bun run db:import
  echo "==> [BreachPoint] Seeding 3 admin accounts into database..."
  bun run db:seed:admins
fi

# 3. Publish and open the event window (default 48 hours)
if [ "${AUTO_PUBLISH:-true}" = "true" ]; then
  echo "==> [BreachPoint] Publishing event for live play (${EVENT_HOURS:-48} hours)..."
  bun run db:publish -- --hours "${EVENT_HOURS:-48}"
fi

# 4. Start the backend application
echo "==> [BreachPoint] Starting backend server..."
exec "$@"
