import os

# Settings require DATABASE_URL at import time. Tests must never touch the demo database,
# so point it at a placeholder (env vars override backend/.env). Database tests use
# TEST_DATABASE_URL instead (added in Phase 11).
os.environ["DATABASE_URL"] = "postgresql://tests-must-not-use-demo-db@invalid/none"
