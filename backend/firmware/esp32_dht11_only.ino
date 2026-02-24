#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
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
#define DHTPIN 5     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
Preferences preferences;

// --- Device State ---
String deviceMac;
String deviceIp;
String stateTopic;

// Variable Mappings
const char* VAR_TEMP = "temperature";
const char* VAR_HUMID = "humidity";

float temperature = 0;
float humidity = 0;

unsigned long lastMsg = 0;
const long interval = 5000; // Update every 5 seconds

// --- Function Prototypes ---
void publishState();
void reconnect();
void handleRoot();
void handleConfig();

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
       
       // Note for the user: If you continue to have issues, use MDNS.address(0) directly
       // if on Espressif Core 3.0+.
       
       // Fallback 2: Try accessing IP directly if Hostname resolution failed or hostname is empty
       // (this would imply a strange network setup)
       if (n > 0) {
           // As per your compilation error, 'class MDNSResponder' has no member named 'IP'.
           // This means you are on a version (likely 3.0.0+) where it was removed.
           // The replacement method is .IP(idx) -> .address(idx) or similar depending on the exact commit.
           
           // However, hostname resolution (below) should work universally.
       }
       
       String serviceHost = MDNS.hostname(0);
       Serial.print("Hostname: ");
       Serial.println(serviceHost);
       
       IPAddress resIp;
       
       // Try Core 3.x+ accessor directly first if hostname logic fails or if you prefer strict IP.
       // Uncomment if hostname resolution is stuck:
       // resIp = MDNS.address(0); // Only for ESP32 Core 3.0.0+
       
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

  // Set topic based on MAC
  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

void handleRoot() {
  String html = "<html><body><h1>HomeForge Setup</h1>";
  html += "<form action='/config' method='POST'>"; // Removed enctype='text/plain' to use standard urlencoded
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
  
  // Use StaticJsonDocument for compatibility with v6 and v7
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, body);

  if (error) {
    // Fallback: Try parsing custom plain text format if JSON fails
    // e.g. "mqtt_server=192.168.1.50"
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

void reconnect() {
  if (strlen(mqtt_server) == 0) return;

  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.println(mqtt_server);
    
    String clientId = "ESP32-Sensor-" + deviceMac;
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
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

  // Use StaticJsonDocument for compatibility
  StaticJsonDocument<512> doc;
  
  // Identity
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  
  // Sensor Data (Standard Keys)
  doc[VAR_TEMP] = temperature;
  doc[VAR_HUMID] = humidity;
  
  char buffer[512];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);
  
  Serial.print("Published: ");
  Serial.println(buffer);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  preferences.begin("mqtt", false);
  String savedServer = preferences.getString("server", "");
  if (savedServer.length() > 0) {
    savedServer.toCharArray(mqtt_server, 40);
  }
  preferences.end();

  setup_wifi();
  
  server.on("/", HTTP_GET, handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  // Add support for GET config in case user tries to submit form via GET by mistake
  // or just wants to post data quickly via URL params if needed in future
  
  server.begin();
  
  if (strlen(mqtt_server) > 0) {
    client.setServer(mqtt_server, mqtt_port);
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

    float newH = dht.readHumidity();
    float newT = dht.readTemperature();

    if (!isnan(newH) && !isnan(newT)) {
      temperature = newT;
      humidity = newH;
      publishState();
    } else {
      Serial.println("Failed to read from DHT sensor!");
    }
  }
}
