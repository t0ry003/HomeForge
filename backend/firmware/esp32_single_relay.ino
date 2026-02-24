#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// --- Network Configuration ---
// REPLACE WITH YOUR CREDENTIALS
const char* ssid = "ony&bya 2.4Ghz";
const char* password = "steaua2011";

// MQTT Server details (discovered via mDNS or config)
char mqtt_server[40] = ""; 
int mqtt_port = 1883;

// --- Hardware Pins ---
#define RELAY_PIN 14  // GPIO 14 for the Relay (Change as needed)

WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
Preferences preferences;

// --- Device State ---
String deviceMac;
String deviceIp;
String stateTopic;
String commandTopic;

// Variable Mappings
const char* VAR_RELAY = "relay_1";
// Optional: we can store the last dynamic key we saw to echo it back
String lastControlKey = "";

bool relayState = false;

unsigned long lastMsg = 0;
const long interval = 5000; // Update every 5 seconds

// --- Function Prototypes ---
void publishState();
void reconnect();
void handleRoot();
void handleConfig();
void callback(char* topic, byte* payload, unsigned int length);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA); // Explicitly set station mode
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

  // Use unique hostname
  String hostname = "esp32-" + deviceMac;
  
  // --- MDNS Discovery ---
  if (!MDNS.begin(hostname.c_str())) { 
     Serial.println("Error setting up MDNS responder!");
  } else {
     Serial.println("mDNS responder started");
     Serial.println("Resolving MQTT Broker via mDNS...");
     
     // Look for service: _mqtt._tcp
     int n = MDNS.queryService("mqtt", "tcp");
     if (n == 0) {
       // Retry once after delay
       delay(1000);
       n = MDNS.queryService("mqtt", "tcp");
     }

     if (n > 0) {
       Serial.print("Found broker at: ");
       
       String serviceHost = MDNS.hostname(0);
       Serial.print("Hostname: ");
       Serial.println(serviceHost);
       
       IPAddress resIp;
       
       // Standard Universal approach (Resolve Hostname):
       WiFi.hostByName(serviceHost.c_str(), resIp);
       
       if (resIp.toString() == "0.0.0.0") {
          // If pure hostname failed, try adding .local
           String localHost = serviceHost + ".local";
           WiFi.hostByName(localHost.c_str(), resIp);
       }
       
       if (resIp.toString() != "0.0.0.0") {
          Serial.print("Resolved IP: ");
          Serial.println(resIp);
          String discoveredIp = resIp.toString();
          discoveredIp.toCharArray(mqtt_server, 40);
          
          // Save to preferences
          preferences.begin("mqtt", false);
          preferences.putString("server", mqtt_server);
          preferences.end();
       } else {
          Serial.println("Could not resolve hostname to IP. Using fallback if available.");
       }
     } else {
       Serial.println("mDNS lookup failed - waiting for manual config or stored IP");
     }
  }

  // Set topics based on MAC
  commandTopic = String("homeforge/devices/") + deviceMac + "/command";
  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

void handleRoot() {
  String html = "<html><body><h1>HomeForge Setup</h1>";
  html += "<form action='/config' method='POST'>"; 
  html += "MQTT Server IP: <input type='text' name='mqtt_server' value='" + String(mqtt_server) + "'><br>";
  html += "<input type='submit' value='Save Config'>";
  html += "</form></body></html>";
  server.send(200, "text/html", html);
}

void handleConfig() {
  // Check if it's a browser form submission or raw JSON
  if (server.hasArg("mqtt_server")) {
    // Form submission
    String serverIp = server.arg("mqtt_server");
    serverIp.toCharArray(mqtt_server, 40);
    
    preferences.begin("mqtt", false);
    preferences.putString("server", mqtt_server);
    preferences.end();
    
    server.send(200, "text/html", "Saved! Device will restart connection...");
    client.setServer(mqtt_server, mqtt_port);
    client.disconnect();
    return;
  }

  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "Body not received");
    return;
  }
  
  String body = server.arg("plain");
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    if (body.startsWith("mqtt_server=")) {
        String ip = body.substring(12);
        ip.trim();
        ip.toCharArray(mqtt_server, 40);
        
        preferences.begin("mqtt", false);
        preferences.putString("server", mqtt_server);
        preferences.end();
        
        server.send(200, "text/plain", "OK");
        client.setServer(mqtt_server, mqtt_port);
        client.disconnect();
        return;
    }
    
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
    
    client.setServer(mqtt_server, mqtt_port);
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
  Serial.println(message);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Handle dynamic keys (e.g. switch-12345) or standard "relay_1"
  bool stateChanged = false;
  
  JsonObject root = doc.as<JsonObject>();
  for (JsonPair kv : root) {
      String key = kv.key().c_str();
      
      // Check if key is "relay_1" OR starts with "switch-"
      if (key == VAR_RELAY || key.startsWith("switch-")) {
          // Store the key so we can echo it back in publishState
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
          stateChanged = true;
          // Since it's a single relay, we break after finding the first valid control key
          break; 
      }
  }

  if (stateChanged) {
      digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
      preferences.begin("state", false);
      preferences.putBool("relay", relayState);
      preferences.end();
      publishState();
  }
}

void reconnect() {
  if (strlen(mqtt_server) == 0) return;

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.println(mqtt_server);
    
    String clientId = "ESP32-Relay-" + deviceMac;
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(commandTopic.c_str());
      publishState(); 
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5s");
      delay(5000);
      return; 
    }
  }
}

void publishState() {
  if (!client.connected()) return;

  StaticJsonDocument<512> doc;
  
  // Identity
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  
  // Relay State - standard key ("relay_1")
  doc[VAR_RELAY] = relayState;
  
  // If we were controlled by a specific dynamic key, echo it back
  // This helps the backend if it's expecting the same key
  if (lastControlKey.length() > 0) {
      doc[lastControlKey] = relayState;
  }
  
  char buffer[512];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);
  
  Serial.print("Published: ");
  Serial.println(buffer);
}

void setup() {
  Serial.begin(115200);
  
  pinMode(RELAY_PIN, OUTPUT);
  // Restore relay state
  preferences.begin("state", true); // Create if doesn't exist
  relayState = preferences.getBool("relay", false);
  preferences.end();
  
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
  
  preferences.begin("mqtt", false);
  String savedServer = preferences.getString("server", "");
  if (savedServer.length() > 0) {
    savedServer.toCharArray(mqtt_server, 40);
  }
  preferences.end();

  setup_wifi();
  
  server.on("/", HTTP_GET, handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  
  server.begin();
  
  if (strlen(mqtt_server) > 0) {
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
  }
}

void loop() {
  server.handleClient();

  if (strlen(mqtt_server) > 0) {
    if (!client.connected()) {
      reconnect();
    }
    client.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    publishState();
  }
}
