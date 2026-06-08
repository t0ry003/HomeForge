# 💡 ESP32 Relay: Wiring Guide

---

## ⭐ Fully Qualified for HomeForge

- ✅ Relay control via GPIO
- ✅ Suitable for 220V AC loads
- ✅ Talks to HomeForge over **MQTT** — no server IP to type in: the broker is
  auto-discovered on your network via mDNS (`_mqtt._tcp`). Perfect for smart
  lighting, plugs and more.

---

## 🧰 Components Required

- ESP32 Dev Board
- 1-Channel 5V Relay Module
- Breadboard
- Jumper Wires (Male-to-Male)
- 240V AC Power Source
- AC Light Bulb (or any 220V load)

---

## 🔌 Pin Connections

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/ESP32-Pinout.png" alt="ESP32 Pinout" style="max-width: 100%;">
</div>

| Module | Pin Name | ESP32 Pin  | Description          |
|--------|----------|------------|----------------------|
| Relay  | VCC      | 3V3        | Power Supply (3.3V)  |
| Relay  | GND      | GND        | Ground               |
| Relay  | IN       | GPIO 5     | Control Signal       |
| Load   | L (Live) | AC Input   | 240V AC Live Line    |
| Load   | N        | AC Neutral | 240V AC Neutral Line |

---

## 🖼️ Wiring Diagram

<div align="center">
  <img src="https://raw.githubusercontent.com/t0ry003/SmartDash/refs/heads/master/device_setup/static/projects/ESP32_RELAY/breadboard.png" alt="ESP32 Relay Wiring" style="max-width: 80%;">
</div>

---

## 📦 Required Arduino Libraries

Install via Arduino IDE → Library Manager:

- **PubSubClient** by Nick O'Leary — MQTT client
- **ArduinoJson** by Benoit Blanchon (v6.x) — command/state payloads

`WiFi`, `ESPmDNS`, `Preferences`, and `WebServer` ship with the ESP32 board package.

---

## ⚠️ Tips

- Be **extremely careful** when working with 220V AC — never handle live wires while powered.
- Use **LOW trigger relays** (active-low) with ESP32.
- You may need to power the relay using 5V if it doesn't activate reliably on 3.3V.
- Consider opto-isolated relay modules for electrical safety.

---

## 🧠 How It Works

- GPIO 5 controls the relay (on/off); the relay state is **persisted across reboots**
  using ESP32 Preferences (NVS).
- **You only enter WiFi credentials.** The HomeForge MQTT broker is auto-discovered on
  your network via mDNS, cached in NVS for fast reconnects, and (if mDNS is blocked) can
  be set manually via a compile-time `server_ip` override or by POSTing to `/config`.
- The device subscribes to `homeforge/devices/<MAC>/command` for control and publishes
  its state to `homeforge/devices/<MAC>/state`.
- HomeForge toggles the relay by publishing a command; the device applies it, persists it,
  and echoes the new state back.

> **Server requirement:** The HomeForge server must advertise its MQTT broker over mDNS as
> `_mqtt._tcp` for zero-config discovery. Auto-discovery works when the server runs on a
> native Linux host on the same LAN (e.g. a Raspberry Pi). On Docker Desktop / Windows /
> WSL, set the broker IP via the firmware `server_ip` variable or the `/config` page.

---

## 📡 MQTT Topics & Payloads

**Command (HomeForge → device):** topic `homeforge/devices/<MAC>/command`
```json
{ "relay_1": true }
```

**State (device → HomeForge):** topic `homeforge/devices/<MAC>/state`
```json
{ "ip": "192.168.1.50", "mac": "AABBCCDDEEFF", "relay_1": true }
```
