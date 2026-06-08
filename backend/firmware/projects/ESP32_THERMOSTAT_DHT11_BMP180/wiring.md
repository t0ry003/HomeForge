# 🌡️ ESP32 Thermostat with DHT11 & BMP180: Wiring Guide

---

## ⭐ Fully Qualified for HomeForge

- ✅ Humidity sensor (DHT11)
- ✅ Temperature monitoring
- ✅ Pressure sensor (BMP180)
- ✅ Reports to HomeForge over **MQTT** — no server IP to type in: the broker is
  auto-discovered on your network via mDNS (`_mqtt._tcp`).

---

## 🧰 Components Required

- ESP32 Dev Board
- DHT11 Sensor
- BMP180 Barometric Sensor
- Breadboard
- Jumper Wires (Male-to-Male)
- 10kΩ Resistor (pull-up for DHT11)

---

## 🔌 Pin Connections

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/ESP32-Pinout.png" alt="ESP32 Pinout" style="max-width: 100%;">
</div>

| Sensor | Pin Name | ESP32 Pin | Description         |
|--------|----------|-----------|---------------------|
| DHT11  | VCC      | 3V3       | Power Supply        |
| DHT11  | GND      | GND       | Ground              |
| DHT11  | DATA     | GPIO 5    | Signal Input        |
| BMP180 | VIN      | 3V3       | Power Supply (3.3V) |
| BMP180 | GND      | GND       | Ground              |
| BMP180 | SCL      | GPIO 22   | I2C Clock           |
| BMP180 | SDA      | GPIO 21   | I2C Data            |

> 💡 **Note:** Add a 10kΩ pull-up resistor between **VCC** and **DATA** on the DHT11.

---

## 🖼️ Sensor Pinouts

### DHT11 Sensor

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/DHT11.png" alt="DHT11 Pinout" style="max-width: 60%;">
</div>

### BMP180 Sensor

<div align="center">
  <img src="https://lastminuteengineers.com/wp-content/uploads/arduino/BMP180-Module-Pinout.png" alt="BMP180 Pinout" style="max-width: 70%;">
</div>

---

## 📦 Required Arduino Libraries

Install via Arduino IDE → Library Manager:

- **PubSubClient** by Nick O'Leary — MQTT client
- **ArduinoJson** by Benoit Blanchon (v6.x) — state payloads
- **DHT sensor library** by Adafruit — temperature & humidity
- **Adafruit BMP085 Library** by Adafruit — works for BMP180 (pressure)

`WiFi`, `ESPmDNS`, `Preferences`, `WebServer`, and `Wire` ship with the ESP32 board package.

---

## ⚠️ Tips

- DHT11 sensors are slower (refresh ~1s), avoid frequent polling.
- BMP180 operates best at **3.3V**, no level shifter needed.
- Both sensors use digital signals but different protocols (DHT = single wire, BMP180 = I2C).
- Use solid connections on breadboard for I2C stability.

---

## 🧠 How It Works

- The ESP32 collects:
    - **Temperature** and **humidity** from the DHT11 (a ±2 °C tolerance correction is applied)
    - **Pressure** from the BMP180 (converted from Pa to hPa)
- **You only enter WiFi credentials.** The HomeForge MQTT broker is auto-discovered on
  your network via mDNS, cached in NVS for fast reconnects, and (if mDNS is blocked) can
  be set manually via a compile-time `server_ip` override or by POSTing to `/config`.
- Readings are published every **5 seconds** to `homeforge/devices/<MAC>/state`. The
  device also publishes its own IP/MAC — register it in the app by that IP.

> **Server requirement:** The HomeForge server must advertise its MQTT broker over mDNS as
> `_mqtt._tcp` for zero-config discovery. Auto-discovery works when the server runs on a
> native Linux host on the same LAN (e.g. a Raspberry Pi). On Docker Desktop / Windows /
> WSL, set the broker IP via the firmware `server_ip` variable or the `/config` page.

---

## 📡 MQTT State Payload

Published to topic `homeforge/devices/<MAC>/state`:

```json
{
  "ip": "192.168.1.50",
  "mac": "AABBCCDDEEFF",
  "temperature": 24.3,
  "humidity": 58.1,
  "pressure": 1007.2
}
```
