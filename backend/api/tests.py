from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Room, DeviceType, Device

User = get_user_model()


class RoomAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_create_room(self):
        response = self.client.post('/api/rooms/', {'name': 'Living Room'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Room.objects.count(), 1)
        self.assertEqual(Room.objects.get().name, 'Living Room')

    def test_list_rooms(self):
        Room.objects.create(name='Kitchen', user=self.user)
        Room.objects.create(name='Bedroom', user=self.user)
        response = self.client.get('/api/rooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class DeviceTypeAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_create_device_type(self):
        data = {
            'name': 'Thermostat',
            'description': 'Smart thermostat',
            'schema': {'sensors': ['temperature'], 'actions': ['set_temp']}
        }
        response = self.client.post('/api/device-types/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DeviceType.objects.count(), 1)

    def test_list_device_types(self):
        DeviceType.objects.create(
            name='Light',
            user=self.user,
            schema={'sensors': ['brightness'], 'actions': ['on', 'off']}
        )
        response = self.client.get('/api/device-types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class DeviceAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)
        self.room = Room.objects.create(name='Living Room', user=self.user)
        self.device_type = DeviceType.objects.create(
            name='Thermostat',
            user=self.user,
            schema={'sensors': ['temperature'], 'actions': ['set_temp']}
        )

    def test_create_device(self):
        data = {
            'name': 'Main Thermostat',
            'ip_address': '192.168.1.100',
            'device_type': self.device_type.id,
            'room': self.room.id,
            'custom_data': {'temperature': 72}
        }
        response = self.client.post('/api/devices/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Device.objects.count(), 1)

    def test_list_devices(self):
        Device.objects.create(
            name='Test Device',
            ip_address='192.168.1.101',
            device_type=self.device_type,
            room=self.room,
            user=self.user
        )
        response = self.client.get('/api/devices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        # Verify device_type_info is included
        self.assertIn('device_type_info', response.data[0])
        self.assertEqual(response.data[0]['device_type_info']['name'], 'Thermostat')

