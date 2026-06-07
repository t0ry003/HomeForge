# ESP32 Relay Switch

## Overview

A simple single-relay device controlled via MQTT. Ideal for smart lighting, plugs, and any ON/OFF load switching.

## Components Required

- ESP32 Dev Board
- 1-Channel 5V Relay Module
- Breadboard
- Jumper Wires (Male-to-Male)

## How It Works

- GPIO 5 controls the relay (on/off) via MQTT commands
- The relay state is persisted across reboots using ESP32 Preferences
- **You only enter WiFi credentials** — the HomeForge MQTT broker is auto-discovered
  on your network via mDNS, cached in NVS for fast reboots, and (if mDNS is blocked)
  can be set manually via HTTP POST to `/config` or a compile-time `server_ip` override
- The device prints and publishes its own IP; register it in the HomeForge app by that IP / MAC
- State is published to `homeforge/devices/<MAC>/state`
- Commands are received on `homeforge/devices/<MAC>/command`

> **Server requirement:** The HomeForge server must advertise its MQTT broker over
> mDNS as `_mqtt._tcp` (e.g. via Avahi/Bonjour) for zero-config discovery to work.

## Required Libraries

Install via Arduino IDE → Library Manager:

- **PubSubClient** by Nick O'Leary
- **ArduinoJson** by Benoit Blanchon (v6.x)

`WiFi`, `ESPmDNS`, `Preferences`, and `WebServer` ship with the ESP32 board package.


## MQTT Payload

**State (published):**
```json
{"ip": "192.168.1.50", "mac": "AABBCCDDEEFF", "relay_1": true}
```

**Command (received):**
```json
{"relay_1": true}
```

## Safety Warning

Be **extremely careful** when working with 220V AC loads. Never handle live wires while powered. Use opto-isolated relay modules for electrical safety.
