# ESP32 Weather Station (DHT11 + BMP180)

## Overview

A full environmental monitoring station combining the DHT11 (temperature + humidity) and BMP180 (temperature + pressure) sensors. Provides comprehensive weather data via MQTT.

## Components Required

- ESP32 Dev Board
- DHT11 Temperature & Humidity Sensor
- BMP180 Barometric Pressure Sensor
- 10kΩ Resistor (pull-up for DHT11 DATA line)
- Breadboard
- Jumper Wires

## How It Works

- Reads temperature and humidity from the DHT11 (GPIO 5)
- Reads pressure from the BMP180 via I2C (SDA=GPIO21, SCL=GPIO22)
- Publishes all three readings via MQTT every 5 seconds
- MQTT broker is auto-discovered via mDNS or configured via HTTP `/config`

## MQTT Payload

**State (published every 5s):**
```json
{"ip": "192.168.1.53", "mac": "AABBCCDDEEFF", "temperature": 24.3, "humidity": 58.1, "pressure": 1013.25}
```

## Sensor Notes

- Temperature is read from the DHT11 (humidity source). For higher accuracy temperature, the BMP180 value can be used instead.
- Pressure is in hPa. Standard sea-level is ~1013.25 hPa.
