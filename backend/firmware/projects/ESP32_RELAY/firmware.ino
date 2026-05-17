#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================
// HomeForge Connection Settings
// DO NOT rename these variables!
// They will be replaced with user values.
// ============================================
const char* wifi_ssid = "{{WIFI_SSID}}";
const char* wifi_password = "{{WIFI_PASSWORD}}";
const char* server_ip = "{{SERVER_IP}}";
const int mqtt_port = 1883;

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
String deviceMac;
String deviceIp;
String stateTopic;
String commandTopic;

bool relayState = false;

unsigned long lastMsg = 0;
const long interval = 5000;

WiFiClient espClient;
PubSubClient client(espClient);

// ============================================
// WiFi Setup
// ============================================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  deviceIp = WiFi.localIP().toString();
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");

  Serial.print("IP Address: ");
  Serial.println(deviceIp);
  Serial.print("MAC Address: ");
  Serial.println(deviceMac);

  // Set MQTT topics based on MAC
  commandTopic = String("homeforge/devices/") + deviceMac + "/command";
  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

// ============================================
// Publish state to MQTT broker
// ============================================
void publishState() {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  doc[VAR_RELAY] = relayState;

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
    if (key == VAR_RELAY || key.startsWith("switch-")) {
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
  publishState();
}

// ============================================
// MQTT Reconnect
// ============================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    String clientId = "ESP32-Relay-" + deviceMac;
    if (client.connect(clientId.c_str())) {
      Serial.println(" connected!");
      client.subscribe(commandTopic.c_str());
      publishState();
    } else {
      Serial.print(" failed (rc=");
      Serial.print(client.state());
      Serial.println("). Retrying in 5s...");
      delay(5000);
    }
  }
}

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  setup_wifi();

  client.setServer(server_ip, mqtt_port);
  client.setCallback(callback);
}

// ============================================
// Main Loop
// ============================================
void loop() {
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
