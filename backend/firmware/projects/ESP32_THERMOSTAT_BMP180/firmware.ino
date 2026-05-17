#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
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
// BMP180 uses I2C: SDA=GPIO21, SCL=GPIO22 (ESP32 defaults)

Adafruit_BMP085 bmp;

// ============================================
// Variable Mappings
// Must match the node IDs in your Device Type
// ============================================
const char* VAR_TEMP = "temperature";
const char* VAR_PRESSURE = "pressure";

// ============================================
// Device State
// ============================================
String deviceMac;
String deviceIp;
String stateTopic;

float temperature = 0;
float pressure = 0;

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

  // Set MQTT topic based on MAC
  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

// ============================================
// Publish sensor data to MQTT broker
// ============================================
void publishState() {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  doc[VAR_TEMP] = temperature;
  doc[VAR_PRESSURE] = pressure;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);

  Serial.print("Published: ");
  Serial.println(buffer);
}

// ============================================
// MQTT Reconnect
// ============================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT broker...");
    String clientId = "ESP32-BMP180-" + deviceMac;
    if (client.connect(clientId.c_str())) {
      Serial.println(" connected!");
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
  if (!bmp.begin()) {
    Serial.println("Could not find BMP180 sensor, check wiring!");
  }

  setup_wifi();

  client.setServer(server_ip, mqtt_port);
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

    float newT = bmp.readTemperature();
    float newP = bmp.readPressure();

    if (!isnan(newT) && !isnan(newP)) {
      temperature = newT;
      pressure = newP / 100.0;  // Pa to hPa
      publishState();
    } else {
      Serial.println("Failed to read from BMP180 sensor!");
    }
  }
}
