## Pin Connections

| Sensor | Pin Name | ESP32 Pin | Description |
|--------|----------|-----------|-------------|
| DHT11 | VCC | 3V3 | Power Supply |
| DHT11 | GND | GND | Ground |
| DHT11 | DATA | GPIO 5 | Signal Input |
| BMP180 | VIN | 3V3 | Power Supply (3.3V) |
| BMP180 | GND | GND | Ground |
| BMP180 | SCL | GPIO 22 | I2C Clock |
| BMP180 | SDA | GPIO 21 | I2C Data |

> Add a 10kΩ pull-up resistor between **VCC** and **DATA** on the DHT11.

## Required Arduino Libraries

- `WiFi` (built-in)
- `PubSubClient` (MQTT)
- `DHT sensor library` by Adafruit
- `Wire` (built-in, I2C)
- `Adafruit BMP085 Unified`
- `ArduinoJson`
- `Preferences` (built-in)

## Tips

- DHT11 sensors are slower (refresh ~1s), avoid frequent polling.
- BMP180 operates best at 3.3V, no level shifter needed.
- Both sensors use digital signals but different protocols (DHT = single wire, BMP180 = I2C).
- Use solid connections on breadboard for I2C stability.
