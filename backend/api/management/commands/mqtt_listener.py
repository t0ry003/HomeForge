import json
import logging
import time
from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
from api.models import Device
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Starts the MQTT Listener to process device updates and monitor offline status'

    def handle(self, *args, **options):
        client = mqtt.Client()
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        
        try:
            self.stdout.write('Connecting to MQTT Broker at localhost:1883...')
            client.connect("localhost", 1883, 60)
            client.loop_start() # Run MQTT loop in background thread
            
            self.stdout.write(self.style.SUCCESS('MQTT Listener running. Monitoring device heartbeats...'))
            
            while True:
                self.check_offline_devices()
                time.sleep(10) # Check every 10 seconds
                
        except KeyboardInterrupt:
            client.loop_stop()
            self.stdout.write(self.style.SUCCESS('Stopped MQTT Listener'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def check_offline_devices(self):
        """
        Check for devices that haven't updated in the last 30 seconds and mark them offline.
        """
        threshold = timezone.now() - timedelta(seconds=30) # 30 seconds timeout (firmware sends every 5s)
        
        # Find devices that are marked online but haven't updated recently
        offline_devices = Device.objects.filter(
            status=Device.STATUS_ONLINE,
            updated_at__lt=threshold
        )
        
        for device in offline_devices:
            self.stdout.write(self.style.WARNING(f"Device {device.name} timed out. Marking OFFLINE."))
            device.status = Device.STATUS_OFFLINE
            device.save(update_fields=['status'])

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.stdout.write(self.style.SUCCESS('Connected to MQTT Broker! Subscribing to homeforge/devices/+/state'))
            client.subscribe("homeforge/devices/+/state")
        else:
            self.stdout.write(self.style.ERROR(f'Connection failed with code {rc}'))

    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload_str = msg.payload.decode()
            self.stdout.write(f"Received message on {topic}: {payload_str}")
            
            # Topic format: homeforge/devices/{MAC}/state
            parts = topic.split('/')
            if len(parts) < 4:
                return

            device_mac_from_topic = parts[2]
            
            try:
                data = json.loads(payload_str)
            except json.JSONDecodeError:
                self.stdout.write(self.style.WARNING(f"Invalid JSON from device {device_mac_from_topic}"))
                return

            # Intelligent Device Matching Logic
            # 1. Try to find device by MAC address (most reliable)
            device = Device.objects.filter(mac_address=device_mac_from_topic).first()
            
            # 2. If not found by MAC, try to find by IP address reported in payload (auto-discovery/binding)
            if not device and "ip" in data:
                reported_ip = data["ip"]
                device = Device.objects.filter(ip_address=reported_ip).first()
                if device:
                    self.stdout.write(self.style.SUCCESS(f"Auto-binding MAC {device_mac_from_topic} to Device {device.name} (IP: {reported_ip})"))
                    device.mac_address = device_mac_from_topic
                    device.save(update_fields=['mac_address'])

            if not device:
                self.stdout.write(self.style.WARNING(f"Device with MAC {device_mac_from_topic} or IP {data.get('ip')} not found in DB."))
                return

            # Update current_state with new data (merge)
            current_state = device.current_state or {}
            
            # Filter out system keys from state blob if desired, or keep them for display
            # We generally want to merge sensor data: temp, humidity, etc.
            
            # --- Auto-Mapping Logic ---
            # Firmware sends: {"temperature": 25.5, "humidity": 60}
            # Device Type has widgets mapped to: "temperature-1771357525497" and "humidity-1771357528548"
            # We need to find which widget corresponds to the incoming key based on widget_type.
            
            remapped_data = {}
            for key, value in data.items():
                # Try to map "standard" keys to "dynamic" keys first
                mapped_key = self.map_standard_key(device, key)
                
                if mapped_key:
                    # If we found a mapping (e.g. relay_1 -> switch-123), use that
                    remapped_data[mapped_key] = value
                    self.stdout.write(f"Mapped incoming '{key}' -> '{mapped_key}'")
                    
                    # Also REMOVE the old standard key if it exists in current_state to avoid duplicates
                    if key in current_state and key != mapped_key:
                        try:
                            del current_state[key]
                        except KeyError:
                            pass
                
                # If no mapping found, check if it's already a known key
                elif key in current_state:
                    remapped_data[key] = value
                
                # Otherwise keep as new unmapped data
                else:
                    remapped_data[key] = value

            current_state.update(remapped_data)
            device.current_state = current_state
            
            # Mark as Online
            if device.status != 'online':
                device.status = 'online'
                self.stdout.write(self.style.SUCCESS(f"Device {device.name} is now ONLINE"))
            
            device.save()
            self.stdout.write(self.style.SUCCESS(f"Updated Device {device.name} state"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))

    def map_standard_key(self, device, key):
        """
        Map standard firmware keys (temperature, humidity, relay_1) to dynamic widget IDs.
        """
        # Load the device's type definition
        try:
            # We need to access the related CardTemplate -> Controls
            # This requires 'device_type' and 'card_template' relation prefetching or simple queries
            # Since this is a management command loop, separate queries per message are acceptable for low volume.
            # Ideally caches would be used.
            
            # Get the CustomDeviceType
            dev_type = device.device_type
            if not hasattr(dev_type, 'card_template'):
                return None
                
            template = dev_type.card_template
            controls = template.controls.all() # Fetch all controls
            
        except Exception:
            return None
        
        # MAPPING RULES: firmware_key -> Widget Type
        target_types = []
        
        if key == "temperature":
            target_types = ['TEMPERATURE', 'GAUGE']
        elif key == "humidity":
            target_types = ['HUMIDITY', 'GAUGE']
        elif key == "pressure":
            target_types = ['PRESSURE', 'GAUGE']
        elif key == "relay_1" or key.startswith("switch-"):
            target_types = ['TOGGLE', 'BUTTON']
        
        if not target_types:
            return None
            
        # Find the first control that matches one of the target types
        for control in controls:
            if control.widget_type in target_types:
                return control.variable_mapping
                
        return None
