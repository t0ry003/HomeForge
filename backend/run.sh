#!/usr/bin/env sh
set -eu

# HomeForge backend startup script.
# Uses POSIX shell syntax to run on images where /bin/sh is not bash.

echo "Upgrading pip..."
python -m pip install --upgrade pip

if [ ! -f "requirements.txt" ]; then
    echo "ERROR: requirements.txt not found in $(pwd)" >&2
    exit 1
fi

echo "Installing dependencies..."
python -m pip install -r requirements.txt

echo "Applying database migrations..."
if [ -f "migrate.sh" ]; then
    if command -v bash >/dev/null 2>&1; then
        bash migrate.sh
    else
        echo "Warning: bash not found; running default Django migrate"
        python manage.py migrate
    fi
else
    python manage.py migrate
fi

# Ensure runtime/media directories exist.
mkdir -p /run/dbus /var/run/dbus /run/avahi-daemon /app/media/avatars

# Remove stale PIDs.
rm -f /run/dbus/pid /var/run/dbus/pid /run/avahi-daemon/pid /run/mosquitto/mosquitto.pid

echo "Starting optional services (DBus, Avahi, Mosquitto) if available..."

if command -v dbus-daemon >/dev/null 2>&1; then
    dbus-daemon --system --fork || echo "Warning: dbus-daemon failed to start"
else
    echo "Warning: dbus-daemon not found; skipping"
fi

if command -v avahi-daemon >/dev/null 2>&1; then
    avahi-daemon --daemonize --no-drop-root || echo "Warning: avahi-daemon failed to start"
else
    echo "Warning: avahi-daemon not found; skipping"
fi

if command -v mosquitto >/dev/null 2>&1; then
    if [ -f /etc/mosquitto/mosquitto.conf ]; then
        mosquitto -d -c /etc/mosquitto/mosquitto.conf || echo "Warning: mosquitto failed to start"
    else
        mosquitto -d || echo "Warning: mosquitto failed to start"
    fi
else
    echo "Warning: mosquitto not found; skipping"
fi

echo "Starting background MQTT listener..."
python manage.py mqtt_listener &

echo "Starting development server on 0.0.0.0:8000..."
exec python manage.py runserver 0.0.0.0:8000

