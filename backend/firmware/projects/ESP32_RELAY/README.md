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
- MQTT broker is auto-discovered via mDNS or can be configured via HTTP POST to `/config`
- State is published to `homeforge/devices/<MAC>/state`
- Commands are received on `homeforge/devices/<MAC>/command`

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
