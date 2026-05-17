# ESP32 Temperature & Humidity Sensor (DHT11)

## Overview

A sensor-only device that reads temperature and humidity from a DHT11 sensor and publishes readings via MQTT. No controllable actuators — purely a monitoring device.

## Components Required

- ESP32 Dev Board
- DHT11 Temperature & Humidity Sensor
- 10kΩ Resistor (pull-up for DATA line)
- Breadboard
- Jumper Wires

## How It Works

- Reads temperature (°C) and humidity (%) every 5 seconds from the DHT11
- Publishes sensor data via MQTT to `homeforge/devices/<MAC>/state`
- MQTT broker is auto-discovered via mDNS or configured via HTTP `/config`
- No command subscription needed (sensor-only device)

## MQTT Payload

**State (published every 5s):**
```json
{"ip": "192.168.1.51", "mac": "AABBCCDDEEFF", "temperature": 24.3, "humidity": 58.1}
```

## Sensor Accuracy

DHT11 has ±2°C temperature accuracy and ±5% humidity accuracy. For better precision, consider the DHT22.
