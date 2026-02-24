#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// --- Network Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";

// MQTT Server details (discovered via mDNS or config)
char mqtt_server[40] = ""; 
int mqtt_port = 1883;

// --- Hardware Pins ---
#define DHTPIN 5
#define DHTTYPE DHT11
#define RELAY_PIN 4

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP085 bmp;

WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
Preferences preferences;

// --- Device State ---
String deviceMac;
String deviceIp;
String commandTopic;
String stateTopic;

// Variable Mappings (Must match the "Node IDs" in your Device Type Builder)
const char* VAR_RELAY = "relay_1";
const char* VAR_TEMP = "temperature";
const char* VAR_HUMID = "humidity";
const char* VAR_PRESSURE = "pressure";

bool relayState = false;
float temperature = 0;
float humidity = 0;
float pressure = 0;

unsigned long lastMsg = 0;
const long interval = 2000;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  
  // Get IP and MAC
  deviceIp = WiFi.localIP().toString();
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", ""); 
  
  Serial.print("Device IP: ");
  Serial.println(deviceIp);
  Serial.print("Device MAC: ");
  Serial.println(deviceMac);

  // --- MDNS Discovery ---
  if (!MDNS.begin(deviceMac.c_str())) { // Hostname: ESP32-<MAC>
     Serial.println("Error setting up MDNS responder!");
  } else {
     Serial.println("mDNS responder started");
     // Look for service: _mqtt._tcp
     Serial.println("Resolving MQTT Broker via mDNS...");
     int n = MDNS.queryService("mqtt", "tcp");
     if (n == 0) {
       Serial.println("No services found");
     } else {
       Serial.print(n);
       Serial.println(" service(s) found");
       
       // Pick first one
       Serial.print("  Name: ");
       Serial.println(MDNS.serviceHostname(0));
       Serial.print("  IP: ");
       Serial.println(MDNS.serviceIP(0));
       
       String discoveredIp = MDNS.serviceIP(0).toString();
       discoveredIp.toCharArray(mqtt_server, 40);
       
       // Save to preferences to persist across reboots
       preferences.begin("mqtt", false);
       preferences.putString("server", mqtt_server);
       preferences.end();
     }
  }

  commandTopic = String("homeforge/devices/") + deviceMac + "/command";
  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

void handleConfig() {
  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "Body not received");
    return;
  }
  
  String body = server.arg("plain");
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }

  if (doc.containsKey("mqtt_server")) {
    String serverIp = doc["mqtt_server"].as<String>();
    serverIp.toCharArray(mqtt_server, 40);
    
    preferences.begin("mqtt", false);
    preferences.putString("server", mqtt_server);
    preferences.end();
    
    server.send(200, "application/json", "{\"status\":\"ok\", \"message\":\"MQTT Server Configured\"}");
    
    // Reconfigure client
    client.setServer(mqtt_server, mqtt_port);
    // Force reconnect loop
    client.disconnect();
  } else {
    server.send(400, "application/json", "{\"error\":\"Missing mqtt_server\"}");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");

  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  if (doc.containsKey(VAR_RELAY)) {
    relayState = doc[VAR_RELAY];
    digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
    publishState();
  }
}

void reconnect() {
  // Loop until we're reconnected or config is missing
  if (strlen(mqtt_server) == 0) {
    return; // Wait for configuration via HTTP
  }

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.println(mqtt_server);
    
    String clientId = "ESP32-" + deviceMac;
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(commandTopic.c_str());
      publishState(); 
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5s");
      delay(5000);
      return; // Return to loop to handle HTTP requests
    }
  }
}

void publishState() {
  if (!client.connected()) return;

  JsonDocument doc;
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  doc[VAR_TEMP] = temperature;
  doc[VAR_HUMID] = humidity;
  doc[VAR_PRESSURE] = pressure;
  doc[VAR_RELAY] = relayState;
  
  char buffer[1024];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  bmp.begin();
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  preferences.begin("mqtt", false);
  String savedServer = preferences.getString("server", "");
  if (savedServer.length() > 0) {
    savedServer.toCharArray(mqtt_server, 40);
  }
  preferences.end();

  setup_wifi();
  
  // Setup config endpoint
  server.on("/config", HTTP_POST, handleConfig);
  server.begin();
  Serial.println("HTTP Config Server started");

  if (strlen(mqtt_server) > 0) {
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
  }
}

void loop() {
  server.handleClient(); // Handle HTTP config requests

  if (strlen(mqtt_server) > 0) {
    if (!client.connected()) {
      reconnect();
    }
    client.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    float newH = dht.readHumidity();
    float newT = dht.readTemperature();
    float newP = bmp.readPressure(); 

    if (!isnan(newH) && !isnan(newT)) {
      temperature = newT;
      humidity = newH;
      if (!isnan(newP)) pressure = newP / 100.0F; 
      
      publishState();
    }
  }
}