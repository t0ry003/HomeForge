## Pin Connections

| BMP180 Pin | ESP32 Pin | Description |
|------------|-----------|-------------|
| VIN | 3V3 | Power Supply (3.3V) |
| GND | GND | Ground |
| SCL | GPIO 22 | I2C Clock |
| SDA | GPIO 21 | I2C Data |

> **Note**: ESP32 uses GPIO 21 for SDA and GPIO 22 for SCL by default.

## Required Arduino Libraries

- `WiFi` (built-in)
- `PubSubClient` (MQTT)
- `Wire` (built-in, I2C)
- `Adafruit BMP085 Unified`
- `ArduinoJson`
- `Preferences` (built-in)

## Tips

- Double-check orientation: VIN is **not** the same as VCC on some boards.
- I2C lines (SCL/SDA) **must** have pull-up resistors — many BMP180 boards include them onboard.
- BMP180 operates at 3.3V — perfect for ESP32 logic levels.
