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

## How the Device Finds the Broker

The firmware tries to reach the MQTT broker in this order:

1. **Manual override (`server_ip`)** — If the `server_ip` variable near the top of the
   sketch is set to a non-empty value, the device connects straight to that IP. The
   HomeForge app substitutes this value when it generates firmware for a known broker
   address, so the frontend can hard-code the server IP here:

   ```cpp
   // OPTIONAL manual override. Leave "" to auto-discover the broker via mDNS.
   const char* server_ip = "";   // e.g. "192.168.1.50"
   ```

2. **mDNS auto-discovery** — If `server_ip` is empty, the device queries the LAN for
   `_mqtt._tcp` and uses the first broker that answers, caching it in NVS for fast reboots.

3. **`/config` web fallback** — If neither of the above finds a broker, the device keeps
   serving a small web page at `http://<device-ip>/` (the IP it prints on the serial
   console). POST the broker address to `/config` to set it manually at runtime, no reflash
   required.

### ⚠️ mDNS auto-discovery requires a native Linux host on the same LAN

mDNS (UDP 5353 multicast) only works end-to-end when the HomeForge server runs on a
**native Linux host on the same physical subnet** as the ESP32 (using Docker
`network_mode: host`). In that setup Avahi advertises the host's real LAN IP and the
device auto-discovers with zero config.

**On Docker Desktop (macOS/Windows) mDNS discovery will NOT reach your devices.** Docker
Desktop runs containers inside a Linux VM, so `network_mode: host` binds to the VM's
internal network (`192.168.65.x` / `172.x.x.x`), not your physical Wi-Fi LAN
(e.g. `192.168.1.x`). The advertisement never crosses onto the wire the ESP32 is on, and
the addresses it would advertise are unroutable from the device. The serial log will show:

```
Discovering HomeForge broker via mDNS...
Broker not found (will retry / use /config fallback).
```

When running on Docker Desktop, use **fallback #1** (set `server_ip` to your computer's
LAN IP, with the broker's `1883` published to that LAN IP) or **fallback #3** (the
`/config` page). For true zero-config auto-discovery, deploy HomeForge on a Linux box
(e.g. a Raspberry Pi or mini-PC) on the same LAN as your devices.

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
