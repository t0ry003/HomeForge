echo "🔧 Upgrading PIP ..."
pip install --upgrade pip

echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "🔄 Applying database migrations..."
if [ -f "migrate.sh" ]; then
    bash migrate.sh
else
    python manage.py migrate
fi

# Ensure directories for services
mkdir -p /run/dbus /var/run/dbus /run/avahi-daemon

# Remove stale PIDs
rm -f /run/dbus/pid /var/run/dbus/pid /run/avahi-daemon/pid /run/mosquitto/mosquitto.pid

echo "🌐 Starting Services (DBus + Avahi + Mosquitto)..."

# Start DBus
dbus-daemon --system --fork

# Start Avahi (mDNS)
avahi-daemon --daemonize --no-drop-root

# Start Mosquitto (MQTT Broker)
# Note: In development container, we run as root often. With proper permissions set in Dockerfile.
mosquitto -d -c /etc/mosquitto/mosquitto.conf

echo " Starting Background MQTT Listener..."
python manage.py mqtt_listener &

echo "🚀 Starting development server..."
python manage.py runserver 0.0.0.0:8000

