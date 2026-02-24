FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    mosquitto \
    mosquitto-clients \
    avahi-daemon \
    avahi-utils \
    dbus \
    libnss-mdns \
    net-tools \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Configure Mosquitto
RUN mkdir -p /var/run/mosquitto && \
    chown mosquitto:mosquitto /var/run/mosquitto
RUN echo "listener 1883 0.0.0.0\nallow_anonymous true" > /etc/mosquitto/conf.d/external.conf

# Configure Avahi
RUN sed -i 's/#enable-dbus=yes/enable-dbus=yes/' /etc/avahi/avahi-daemon.conf
