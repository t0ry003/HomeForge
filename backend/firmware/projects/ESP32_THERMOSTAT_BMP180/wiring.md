# 🌡️ ESP32 Thermostat with BMP180: Wiring Guide

---

## 🛠️ Not Fully Qualified for HomeForge

- ✅ Barometric pressure sensor (BMP180)
- ✅ Temperature monitoring
- 🚫 No humidity sensor
- ✅ Reports to HomeForge over **MQTT** — no server IP to type in: the broker is
  auto-discovered on your network via mDNS (`_mqtt._tcp`).

---

## 🧰 Components Required

- ESP32 Dev Board
- BMP180 Barometric Sensor
- Breadboard
- Jumper Wires (Male-to-Male)

---

## 🔌 Pin Connections

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/ESP32-Pinout.png" alt="ESP32 Pinout" style="max-width: 100%;">
</div>

| BMP180 Pin | ESP32 Pin | Description         |
|------------|-----------|---------------------|
| VIN        | 3V3       | Power Supply (3.3V) |
| GND        | GND       | Ground              |
| SCL        | GPIO 22   | I2C Clock           |
| SDA        | GPIO 21   | I2C Data            |

> 💡 **Note:** ESP32 uses GPIO 21 for `SDA` and GPIO 22 for `SCL` by default in many
> libraries (e.g., Adafruit BMP180, SparkFun BMP180).

---

## 🖼️ BMP180 Sensor Pinout

<div align="center">
  <img src="https://lastminuteengineers.com/wp-content/uploads/arduino/BMP180-Module-Pinout.png" alt="BMP180 Pinout" style="max-width: 100%;">
</div>

---

## 📦 Required Arduino Libraries

Install via Arduino IDE → Library Manager:

- **PubSubClient** by Nick O'Leary — MQTT client
- **ArduinoJson** by Benoit Blanchon (v6.x) — state payloads
- **Adafruit BMP085 Library** by Adafruit — works for BMP180 (temperature & pressure)

`WiFi`, `ESPmDNS`, `Preferences`, `WebServer`, and `Wire` ship with the ESP32 board package.

---

## ⚠️ Tips

- Double-check orientation: VIN is **not** the same as VCC on some boards.
- I2C lines (SCL/SDA) **must** have pull-up resistors — many BMP180 boards include them onboard.
- BMP180 operates at 3.3V — perfect for ESP32 logic levels.

---

## 🧠 How It Works

- The ESP32 reads **temperature** and **barometric pressure** from the BMP180 (pressure is
  converted from Pa to hPa).
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
  "temperature": 23.6,
  "pressure": 1007.2
}
```
