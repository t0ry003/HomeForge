from django.core.management.base import BaseCommand
from api.models import Device
import subprocess
import platform

class Command(BaseCommand):
    help = 'Pings all devices and updates their status.'

    def handle(self, *args, **options):
        devices = Device.objects.all()
        for device in devices:
            self.stdout.write(f"Checking {device.name} ({device.ip_address})...")
            
            # Simple simulation logic for development environment
            # If IP is one of our mock IPs (192.168.1.1XX), we simulate randomness
            # If it looks like a real IP, we try to ping it.
            
            is_mock = device.ip_address.startswith("192.168.1.1") and len(device.ip_address) > 11
            
            if is_mock:
                # 80% chance online, 10% offline, 10% error
                import random
                rand = random.random()
                if rand < 0.8:
                    new_status = Device.STATUS_ONLINE
                elif rand < 0.9:
                    new_status = Device.STATUS_OFFLINE
                else:
                    new_status = Device.STATUS_ERROR
                
                device.status = new_status
                device.save()
                self.stdout.write(self.style.SUCCESS(f"  -> [MOCK] Status set to {new_status}"))
            
            else:
                # Actual Ping Logic
                try:
                    # -c 1 for count, -W 1 for timeout (seconds)
                    output = subprocess.run(
                        ['ping', '-c', '1', '-W', '1', device.ip_address],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE
                    )
                    
                    if output.returncode == 0:
                        device.status = Device.STATUS_ONLINE
                        self.stdout.write(self.style.SUCCESS(f"  -> ONLINE"))
                    else:
                        device.status = Device.STATUS_OFFLINE
                        self.stdout.write(self.style.WARNING(f"  -> OFFLINE (Unreachable)"))
                        
                except Exception as e:
                    device.status = Device.STATUS_ERROR
                    self.stdout.write(self.style.ERROR(f"  -> ERROR ({str(e)})"))
                
                device.save()
