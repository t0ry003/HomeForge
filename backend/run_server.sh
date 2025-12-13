#!/bin/bash
python manage.py runserver 0.0.0.0:8000
except Exception as e:
		print(f"Error setting up Django: {e}", file=sys.stderr)
		sys.exit(1)
IFS=',' read -r -a DBS_ARRAY <<< "${DBS_CSV}"
echo "Detected databases: ${DBS_ARRAY[*]}"
echo "Running migrations for databases: ${DBS_CSV}"
	python manage.py migrate --database="${DB}" || { echo "migrate for database ${
DB} failed" >&2; exit 1; }
;;
	esac
done