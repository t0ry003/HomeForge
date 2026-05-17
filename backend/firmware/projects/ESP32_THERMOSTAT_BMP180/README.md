# ESP32 Barometric Sensor (BMP180)

## Overview

A sensor-only device that reads temperature and atmospheric pressure from a BMP180 barometric sensor via I2C. Useful for weather monitoring and altitude estimation.

## Components Required

- ESP32 Dev Board
- BMP180 Barometric Pressure Sensor
- Breadboard
- Jumper Wires

## How It Works

- Reads temperature (°C) and pressure (hPa) every 5 seconds from the BMP180
- Communicates via I2C (SDA=GPIO21, SCL=GPIO22)
- Publishes sensor data via MQTT to `homeforge/devices/<MAC>/state`
- MQTT broker is auto-discovered via mDNS or configured via HTTP `/config`

## MQTT Payload

**State (published every 5s):**
```json
{"ip": "192.168.1.52", "mac": "AABBCCDDEEFF", "temperature": 23.1, "pressure": 1013.25}
```

## Notes

- Pressure is reported in hPa (hectopascals). Standard sea-level pressure is ~1013.25 hPa.
- BMP180 temperature is generally more accurate than DHT11 (±0.5°C vs ±2°C).
