#!/usr/bin/env bash
set -euo pipefail
# Script: parameterized migration helper
# Usage:
#   ./migrate_api.sh [app1 app2 ...]                 # migrate these apps across all DBs
#   ./migrate_api.sh --databases=db1,db2 app1 app2    # migrate these apps on specified DBs
#   ./migrate_api.sh                                  # makemigrations and migrate all DBs

cd /app || { echo "Failed to cd /app" >&2; exit 1; }

APPS=()
EXPLICIT_DBS=""

print_usage() {
	cat <<USAGE
Usage: $0 [--databases=db1,db2] [app1 app2 ...]

If no apps are provided, the script runs makemigrations and migrates all apps.
USAGE
}

for arg in "$@"; do
	case "$arg" in
		--help|-h)
			print_usage
			exit 0
			;;
		--databases=*)
			EXPLICIT_DBS="${arg#--databases=}"
			;;
		--databases)
			echo "Error: use --databases=db1,db2 (no space)" >&2
			exit 2
			;;
		*)
			APPS+=("$arg")
			;;
	esac
done

if [ ${#APPS[@]} -eq 0 ]; then
	echo "Running makemigrations for all apps (if any)..."
	python manage.py makemigrations --noinput || echo "makemigrations: no changes or error (continuing)"
else
	echo "Running makemigrations for specified apps: ${APPS[*]}"
	for app in "${APPS[@]}"; do
		echo "  makemigrations $app"
		python manage.py makemigrations --noinput "$app" || echo "makemigrations for $app: no changes or failed (continuing)"
	done
fi

echo "Detecting databases from Django settings..."
DBS_CSV=""
if [ -n "${EXPLICIT_DBS}" ]; then
	DBS_CSV="${EXPLICIT_DBS}"
else
	DBS_CSV=$(python - <<'PY'
import os, sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'my_backend.settings')
import django
try:
		django.setup()
		from django.conf import settings
		print(','.join(settings.DATABASES.keys()))
except Exception as e:
		# If settings can't be loaded, print nothing
		print('', end='')
PY
	)
fi

if [ -z "${DBS_CSV}" ]; then
	echo "No DATABASES entries found in settings; running default migrate"
	python manage.py migrate || { echo "migrate failed" >&2; exit 1; }
	echo "Migrations completed."
	exit 0
fi

IFS=',' read -r -a DBS <<< "${DBS_CSV}"
for DB in "${DBS[@]}"; do
	DB=$(echo "${DB}" | xargs) # trim whitespace
	if [ -z "${DB}" ]; then
		continue
	fi
	echo "Running migrations for database: ${DB}"
	if [ ${#APPS[@]} -eq 0 ]; then
		python manage.py migrate --database "${DB}" || { echo "Migration failed for database: ${DB}" >&2; exit 1; }
	else
		for app in "${APPS[@]}"; do
			echo "  migrate ${app} on ${DB}"
			python manage.py migrate "$app" --database "${DB}" || { echo "Migration failed for ${app} on ${DB}" >&2; exit 1; }
		done
	fi
done

echo "All requested migrations completed."