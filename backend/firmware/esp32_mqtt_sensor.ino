#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <ArduinoJson.h> // Requires ArduinoJson library (v6 or v7)

// --- Device Configuration ---
// Unique ID for this device (Must match the ID in your Django Admin)
const char* DEVICE_ID = "2"; // Changed ID to avoid conflict with relay device

// --- Network Configuration ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASS";
const char* mqtt_server = "192.168.1.100"; // Address of your Server/MQTT Broker
const int mqtt_port = 1883;

// --- MQTT Topics ---
String stateTopic = String("homeforge/devices/") + DEVICE_ID + "/state";

WiFiClient espClient;
PubSubClient client(espClient);

// --- Hardware Pins ---
#define DHTPIN 5
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
Adafruit_BMP085 bmp;

// --- State Variables ---
float temperature = 0;
float humidity = 0;
float pressure = 0;

unsigned long lastMsg = 0;
const long interval = 2000; // 2 seconds

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
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "ESP32Sensor-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      // Sensors only publish, they usually don't subscribe to commands unless configurable
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void publishState() {
  JsonDocument doc;
  
  // Add sensor data
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pressure"] = pressure;
    
  char buffer[512];
  serializeJson(doc, buffer);
  
  client.publish(stateTopic.c_str(), buffer);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  if (!bmp.begin()) {
    Serial.println("Could not find a valid BMP085 sensor, check wiring!");
  }

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  // No callback needed for pure sensor device as it doesn't receive commands
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    float newH = dht.readHumidity();
    float newT = dht.readTemperature();
    float newP = bmp.readPressure();

    if (!isnan(newH) && !isnan(newT)) {
      temperature = newT;
      humidity = newH;
      pressure = newP / 100.0F; // Pa to hPa
      
      publishState();
    }
  }
}
