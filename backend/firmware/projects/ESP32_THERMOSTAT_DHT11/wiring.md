# 🌡️ ESP32 Thermostat with DHT11: Wiring Guide

---

## 🛠️ Not Fully Qualified for HomeForge

- ✅ Humidity sensor (DHT11)
- ✅ Temperature monitoring
- 🚫 No pressure sensor
- ✅ Reports to HomeForge over **MQTT** — no server IP to type in: the broker is
  auto-discovered on your network via mDNS (`_mqtt._tcp`).

---

## 🧰 Components Required

- ESP32 Dev Board
- DHT11 Sensor
- Breadboard
- Jumper Wires (Male-to-Male)
- 10kΩ Resistor (pull-up for DHT11)

---

## 🔌 Pin Connections

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/ESP32-Pinout.png" alt="ESP32 Pinout" style="max-width: 100%;">
</div>

| DHT11 Pin | ESP32 Pin | Description  |
|-----------|-----------|--------------|
| VCC       | 3V3       | Power Supply |
| GND       | GND       | Ground       |
| DATA      | GPIO 5    | Signal Input |

> 💡 **Note:** Add a 10kΩ pull-up resistor between **VCC** and **DATA** on the DHT11.

---

## 🖼️ Sensor Pinout

### DHT11 Sensor

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/DHT11.png" alt="DHT11 Pinout" style="max-width: 60%;">
</div>

---

## 📦 Required Arduino Libraries

Install via Arduino IDE → Library Manager:

- **PubSubClient** by Nick O'Leary — MQTT client
- **ArduinoJson** by Benoit Blanchon (v6.x) — state payloads
- **DHT sensor library** by Adafruit — temperature & humidity

`WiFi`, `ESPmDNS`, `Preferences`, and `WebServer` ship with the ESP32 board package.

---

## ⚠️ Tips

- Use a 10kΩ pull-up resistor on the DATA line.
- Ensure a proper ground connection between ESP32 and DHT11.
- DHT11 sensors are slow (refresh ~1s), avoid overly frequent polling.

---

## 🧠 How It Works

- The ESP32 reads **temperature** and **humidity** from the DHT11 (a ±2 °C tolerance
  correction is applied to the temperature).
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
  "humidity": 58.1
}
```
