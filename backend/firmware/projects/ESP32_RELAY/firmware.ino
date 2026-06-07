/*
 * HomeForge - ESP32 Single Relay (Auto-Discovery)
 * ------------------------------------------------
 * You only provide WiFi credentials. The device finds the HomeForge
 * MQTT broker automatically on your network via mDNS (Bonjour/Avahi),
 * caches it for fast reboots, and then "just lives" on the WiFi.
 *
 * After flashing: the device prints its IP over Serial and publishes it
 * in every MQTT state message. Register the device in the HomeForge app
 * using that IP / its MAC.
 *
 * Required libraries (Arduino IDE -> Library Manager):
 *   - PubSubClient   by Nick O'Leary
 *   - ArduinoJson    by Benoit Blanchon  (v6.x)
 * The following ship with the ESP32 board package:
 *   - WiFi, ESPmDNS, Preferences, WebServer
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WebServer.h>

// ============================================
// HomeForge Connection Settings
// DO NOT rename wifi_ssid / wifi_password!
// They are replaced with user values by HomeForge.
// ============================================
const char* wifi_ssid     = "{{WIFI_SSID}}";
const char* wifi_password = "{{WIFI_PASSWORD}}";

// OPTIONAL manual override. Leave "" to auto-discover the broker via mDNS.
// (You normally do NOT need to set this.)
const char* server_ip = "";
const int   mqtt_port = 1883;

// mDNS service advertised by the HomeForge server for its MQTT broker.
const char* MDNS_SERVICE = "mqtt";
const char* MDNS_PROTO   = "tcp";

// ============================================
// Pin Definitions
// ============================================
#define RELAY_PIN 5  // GPIO 5 for the Relay

// ============================================
// Variable Mappings
// Must match the node IDs in your Device Type
// ============================================
const char* VAR_RELAY = "relay_1";

// ============================================
// Device State
// ============================================
char   mqttServer[40] = "";   // resolved broker IP
String deviceMac;
String deviceIp;
String stateTopic;
String commandTopic;
String lastControlKey = "";   // echo back the dynamic key we were controlled with

bool relayState = false;

unsigned long lastMsg = 0;
const long interval = 5000;

WiFiClient   espClient;
PubSubClient client(espClient);
WebServer    server(80);
Preferences  preferences;

// ---- Forward declarations ----
void setup_wifi();
bool resolveBroker();
bool discoverBroker();
void saveBroker(const String& ip);
void publishState();
void reconnect();
void callback(char* topic, byte* payload, unsigned int length);
void handleRoot();
void handleConfig();

// ============================================
// WiFi Setup
// ============================================
void setup_wifi() {
  delay(10);
  Serial.printf("\nConnecting to %s", wifi_ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  deviceIp = WiFi.localIP().toString();
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");

  Serial.printf("\nWiFi connected.  IP: %s  MAC: %s\n",
                deviceIp.c_str(), deviceMac.c_str());

  // Set MQTT topics based on MAC
  commandTopic = String("homeforge/devices/") + deviceMac + "/command";
  stateTopic   = String("homeforge/devices/") + deviceMac + "/state";

  // Start mDNS responder (also lets the server find this device by hostname).
  String hostname = "homeforge-" + deviceMac;
  if (MDNS.begin(hostname.c_str())) {
    Serial.printf("mDNS responder started: %s.local\n", hostname.c_str());
  }
}

// ============================================
// Persist discovered broker to NVS
// ============================================
void saveBroker(const String& ip) {
  preferences.begin("homeforge", false);
  preferences.putString("broker", ip);
  preferences.end();
}

// ============================================
// Resolve broker: manual override -> cache -> mDNS
// ============================================
bool resolveBroker() {
  // 1) Manual override always wins.
  if (strlen(server_ip) > 0) {
    strncpy(mqttServer, server_ip, sizeof(mqttServer) - 1);
    Serial.printf("Using manual broker: %s\n", mqttServer);
    return true;
  }
  // 2) Cached value from a previous boot (fast path).
  preferences.begin("homeforge", true);
  String cached = preferences.getString("broker", "");
  preferences.end();
  if (cached.length() > 0) {
    strncpy(mqttServer, cached.c_str(), sizeof(mqttServer) - 1);
    Serial.printf("Using cached broker: %s\n", mqttServer);
    return true;
  }
  // 3) Discover via mDNS.
  return discoverBroker();
}

// ============================================
// mDNS broker discovery
// ============================================
bool discoverBroker() {
  Serial.println("Discovering HomeForge broker via mDNS...");
  for (int attempt = 0; attempt < 3; attempt++) {
    int n = MDNS.queryService(MDNS_SERVICE, MDNS_PROTO);
    if (n > 0) {
      IPAddress ip = MDNS.address(0);
      String found = ip.toString();
      if (found != "0.0.0.0") {
        strncpy(mqttServer, found.c_str(), sizeof(mqttServer) - 1);
        saveBroker(found);
        Serial.printf("Broker found: %s\n", mqttServer);
        return true;
      }
    }
    delay(1000);
  }
  Serial.println("Broker not found (will retry / use /config fallback).");
  return false;
}

// ============================================
// Publish state to MQTT broker
// ============================================
void publishState() {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["ip"]  = deviceIp;
  doc["mac"] = deviceMac;
  doc[VAR_RELAY] = relayState;
  if (lastControlKey.length() > 0) {
    doc[lastControlKey] = relayState;  // echo dynamic key back
  }

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);

  Serial.print("Published: ");
  Serial.println(buffer);
}

// ============================================
// Handle incoming MQTT commands
// ============================================
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Command received: ");
  Serial.println(message);

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message)) return;

  JsonObject root = doc.as<JsonObject>();
  for (JsonPair kv : root) {
    String key = kv.key().c_str();
    // Accept the standard "relay_1" or any dynamic "switch-..." key.
    if (key == VAR_RELAY || key.startsWith("switch-")) {
      lastControlKey = key;
      if (kv.value().is<bool>()) {
        relayState = kv.value().as<bool>();
      } else if (kv.value().is<const char*>()) {
        String val = kv.value().as<String>();
        val.toLowerCase();
        relayState = (val == "true" || val == "on" || val == "1");
      } else if (kv.value().is<int>()) {
        relayState = kv.value().as<int>() == 1;
      }
      break;
    }
  }

  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);

  // Persist relay state across reboots.
  preferences.begin("state", false);
  preferences.putBool("relay", relayState);
  preferences.end();

  publishState();
}

// ============================================
// MQTT Reconnect (re-discovers broker if needed)
// ============================================
void reconnect() {
  int tries = 0;
  while (!client.connected()) {
    if (strlen(mqttServer) == 0) {
      if (!discoverBroker()) { delay(3000); return; }
      client.setServer(mqttServer, mqtt_port);
    }

    Serial.printf("Connecting to MQTT broker %s ...", mqttServer);
    String clientId = "ESP32-Relay-" + deviceMac;
    if (client.connect(clientId.c_str())) {
      Serial.println(" connected!");
      client.subscribe(commandTopic.c_str());
      publishState();
    } else {
      Serial.printf(" failed (rc=%d). Retrying in 5s...\n", client.state());
      // After a few failures, the cached broker may be stale -> rediscover.
      if (++tries >= 3 && strlen(server_ip) == 0) {
        mqttServer[0] = '\0';
        tries = 0;
      }
      delay(5000);
      return;
    }
  }
}

// ============================================
// Web config fallback (only needed if mDNS is blocked)
// POST /config  with form field or JSON: mqtt_server=<ip>
// ============================================
void handleRoot() {
  String html = "<html><body><h1>HomeForge Setup</h1>";
  html += "<p>Broker is normally auto-discovered. Use this only if needed.</p>";
  html += "<form action='/config' method='POST'>";
  html += "MQTT Server IP: <input name='mqtt_server' value='" + String(mqttServer) + "'>";
  html += "<input type='submit' value='Save'></form></body></html>";
  server.send(200, "text/html", html);
}

void handleConfig() {
  String ip = "";
  if (server.hasArg("mqtt_server")) {
    ip = server.arg("mqtt_server");
  } else if (server.hasArg("plain")) {
    String body = server.arg("plain");
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, body) && doc.containsKey("mqtt_server")) {
      ip = doc["mqtt_server"].as<String>();
    } else if (body.startsWith("mqtt_server=")) {
      ip = body.substring(12);
    }
  }

  ip.trim();
  if (ip.length() == 0) {
    server.send(400, "application/json", "{\"error\":\"Missing mqtt_server\"}");
    return;
  }

  ip.toCharArray(mqttServer, sizeof(mqttServer));
  saveBroker(ip);
  server.send(200, "application/json", "{\"status\":\"ok\"}");

  client.setServer(mqttServer, mqtt_port);
  client.disconnect();  // force reconnect with the new broker
}

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);

  // Restore last relay state.
  preferences.begin("state", true);
  relayState = preferences.getBool("relay", false);
  preferences.end();
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);

  setup_wifi();

  resolveBroker();
  if (strlen(mqttServer) > 0) {
    client.setServer(mqttServer, mqtt_port);
  }
  client.setCallback(callback);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  server.begin();
}

// ============================================
// Main Loop
// ============================================
void loop() {
  server.handleClient();

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    publishState();
  }
}
