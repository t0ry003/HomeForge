## Pin Connections

| DHT11 Pin | ESP32 Pin | Description |
|-----------|-----------|-------------|
| VCC | 3V3 | Power Supply (3.3V) |
| GND | GND | Ground |
| DATA | GPIO 5 | Signal Input |

> **Note**: Use a **10kΩ pull-up resistor** between VCC and DATA for stability.

## Required Arduino Libraries

- `WiFi` (built-in)
- `PubSubClient` (MQTT)
- `DHT sensor library` by Adafruit
- `ArduinoJson`
- `Preferences` (built-in)

## Tips

- Use a 10kΩ pull-up resistor on the DATA line.
- Ensure a proper ground connection between ESP32 and DHT11.
- DHT11 sensors are slower (~1s refresh), avoid overly frequent polling.
