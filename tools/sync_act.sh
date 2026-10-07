#!/bin/sh
# Pull the ACT bank across and rebuild everything that depends on it.
#
# Run this after the ACT project gains questions. The two banks stay separate
# in every other respect - separate files, separate taxonomies, separate
# student pages, assigned independently - and this is the only seam between
# them: a one-way copy, re-run on demand.
set -e
cd "$(dirname "$0")/.."
python3 tools/import_act.py
python3 tools/check_licensing.py
python3 tools/stage_public_data.py
if [ -d apps/web/node_modules ]; then
  (cd apps/web && npm run build >/dev/null && echo "web rebuilt")
fi
echo "ACT bank synced."
