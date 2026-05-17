## Pin Connections

| Module | Pin Name | ESP32 Pin | Description |
|--------|----------|-----------|-------------|
| Relay | VCC | 3V3 | Power Supply (3.3V) |
| Relay | GND | GND | Ground |
| Relay | IN | GPIO 5 | Control Signal |

## Required Arduino Libraries

- `WiFi` (built-in)
- `PubSubClient` (MQTT)
- `ArduinoJson`
- `Preferences` (built-in)

## Tips

- Be **extremely careful** when working with 220V AC — never handle live wires while powered.
- Use **LOW trigger relays** (active-low) with ESP32.
- You may need to power the relay using 5V if it doesn't activate reliably on 3.3V.
- Consider opto-isolated relay modules for electrical safety.
