import paho.mqtt.client as mqtt
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_PREFIX = "homeforge/devices"

class MQTTClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MQTTClient, cls).__new__(cls)
            cls._instance.client = mqtt.Client()
            cls._instance.connected = False
        return cls._instance

    def connect(self):
        if not self.connected:
            try:
                self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
                self.client.loop_start()
                self.connected = True
                logger.info("Connected to MQTT Broker")
            except Exception as e:
                logger.error(f"Failed to connect to MQTT Broker: {e}")

    def publish(self, device_id, command_data):
        """
        Publish a command to a device.
        Topic: homeforge/devices/{device_id}/command
        """
        if not self.connected:
            self.connect()
        
        topic = f"{MQTT_TOPIC_PREFIX}/{device_id}/command"
        payload = json.dumps(command_data)
        self.client.publish(topic, payload)
        logger.info(f"Published to {topic}: {payload}")

mqtt_client = MQTTClient()
