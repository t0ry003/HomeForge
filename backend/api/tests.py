from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Device, Room, CustomDeviceType, DashboardLayout, Profile


class DashboardLayoutAPITest(APITestCase):
    """Tests for Dashboard Layout API endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='TestPass1')
        self.admin = User.objects.create_user(username='adminuser', password='TestPass1')
        self.admin.profile.role = Profile.ROLE_ADMIN
        self.admin.profile.save()

        self.device_type = CustomDeviceType.objects.create(
            name='Test Light', definition={}, approved=True
        )
        self.device1 = Device.objects.create(
            name='Light 1', ip_address='192.168.1.10',
            device_type=self.device_type, user=self.user
        )
        self.device2 = Device.objects.create(
            name='Light 2', ip_address='192.168.1.11',
            device_type=self.device_type, user=self.user
        )
        self.device3 = Device.objects.create(
            name='Light 3', ip_address='192.168.1.12',
            device_type=self.device_type, user=self.user
        )

        self.valid_layout = {
            "layout": {
                "version": 1,
                "items": [
                    {"type": "device", "deviceId": self.device1.id},
                    {"type": "device", "deviceId": self.device2.id},
                ]
            }
        }

        self.client = APIClient()

    # ── GET /api/dashboard-layout/ ──

    def test_get_no_layout_returns_null(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['layout'])
        self.assertFalse(response.data['is_personal'])
        self.assertEqual(response.data['device_order'], 'room')

    def test_get_personal_layout(self):
        self.client.force_authenticate(user=self.user)
        DashboardLayout.objects.create(
            user=self.user,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='type'
        )
        response = self.client.get('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_personal'])
        self.assertEqual(response.data['layout']['version'], 1)
        self.assertEqual(response.data['device_order'], 'type')

    def test_get_falls_back_to_shared_layout(self):
        self.client.force_authenticate(user=self.user)
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='status'
        )
        response = self.client.get('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_personal'])
        self.assertIsNotNone(response.data['layout'])
        self.assertEqual(response.data['device_order'], 'status')

    def test_personal_layout_takes_priority_over_shared(self):
        self.client.force_authenticate(user=self.user)
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]}
        )
        DashboardLayout.objects.create(
            user=self.user,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device2.id}]}
        )
        response = self.client.get('/api/dashboard-layout/')
        self.assertTrue(response.data['is_personal'])
        self.assertEqual(response.data['layout']['items'][0]['deviceId'], self.device2.id)

    # ── PUT /api/dashboard-layout/ ──

    def test_put_creates_personal_layout(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put('/api/dashboard-layout/', self.valid_layout, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_personal'])
        self.assertTrue(DashboardLayout.objects.filter(user=self.user).exists())

    def test_put_upserts_personal_layout(self):
        self.client.force_authenticate(user=self.user)
        self.client.put('/api/dashboard-layout/', self.valid_layout, format='json')
        updated = {
            "layout": {
                "version": 1,
                "items": [{"type": "device", "deviceId": self.device1.id}]
            }
        }
        response = self.client.put('/api/dashboard-layout/', updated, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['layout']['items']), 1)
        self.assertEqual(DashboardLayout.objects.filter(user=self.user).count(), 1)

    def test_put_with_folder(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {
                        "type": "folder",
                        "folderId": "folder-abc-123",
                        "name": "Living Room",
                        "deviceIds": [self.device1.id, self.device2.id]
                    },
                    {"type": "device", "deviceId": self.device3.id},
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Validation tests ──

    def test_rejects_wrong_version(self):
        self.client.force_authenticate(user=self.user)
        data = {"layout": {"version": 2, "items": [{"type": "device", "deviceId": self.device1.id}]}}
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_empty_items(self):
        self.client.force_authenticate(user=self.user)
        data = {"layout": {"version": 1, "items": []}}
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_duplicate_device_ids(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {"type": "device", "deviceId": self.device1.id},
                    {"type": "device", "deviceId": self.device1.id},
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_duplicate_device_across_folder_and_standalone(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {"type": "device", "deviceId": self.device1.id},
                    {
                        "type": "folder",
                        "folderId": "f-123",
                        "name": "Room",
                        "deviceIds": [self.device1.id, self.device2.id]
                    },
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_nonexistent_device(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [{"type": "device", "deviceId": 99999}]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_other_users_device(self):
        """All devices are visible to all users, so other user's device is allowed."""
        other = User.objects.create_user(username='other', password='TestPass1')
        other_device = Device.objects.create(
            name='Other Device', ip_address='192.168.1.99',
            device_type=self.device_type, user=other
        )
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [{"type": "device", "deviceId": other_device.id}]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_folder_with_one_device(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {
                        "type": "folder",
                        "folderId": "f-1",
                        "name": "Solo",
                        "deviceIds": [self.device1.id]
                    }
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_folder_with_five_devices(self):
        self.client.force_authenticate(user=self.user)
        d4 = Device.objects.create(name='D4', ip_address='192.168.1.20', device_type=self.device_type, user=self.user)
        d5 = Device.objects.create(name='D5', ip_address='192.168.1.21', device_type=self.device_type, user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {
                        "type": "folder",
                        "folderId": "f-1",
                        "name": "Big",
                        "deviceIds": [self.device1.id, self.device2.id, self.device3.id, d4.id, d5.id]
                    }
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_folder_name_too_long(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {
                        "type": "folder",
                        "folderId": "f-1",
                        "name": "A" * 51,
                        "deviceIds": [self.device1.id, self.device2.id]
                    }
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_duplicate_folder_ids(self):
        self.client.force_authenticate(user=self.user)
        d4 = Device.objects.create(name='D4', ip_address='192.168.1.20', device_type=self.device_type, user=self.user)
        data = {
            "layout": {
                "version": 1,
                "items": [
                    {
                        "type": "folder",
                        "folderId": "f-dup",
                        "name": "A",
                        "deviceIds": [self.device1.id, self.device2.id]
                    },
                    {
                        "type": "folder",
                        "folderId": "f-dup",
                        "name": "B",
                        "deviceIds": [self.device3.id, d4.id]
                    }
                ]
            }
        }
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── DELETE /api/dashboard-layout/ ──

    def test_delete_personal_layout(self):
        self.client.force_authenticate(user=self.user)
        DashboardLayout.objects.create(
            user=self.user,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]}
        )
        response = self.client.delete('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(DashboardLayout.objects.filter(user=self.user).exists())

    def test_delete_idempotent(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    # ── Admin endpoints ──

    def test_admin_get_shared_layout(self):
        self.client.force_authenticate(user=self.admin)
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]}
        )
        response = self.client.get('/api/admin/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_personal'])
        self.assertIsNotNone(response.data['layout'])

    def test_admin_get_no_shared_layout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['layout'])

    def test_admin_put_shared_layout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put('/api/admin/dashboard-layout/', self.valid_layout, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_personal'])
        self.assertTrue(DashboardLayout.objects.filter(user__isnull=True).exists())

    def test_non_admin_cannot_access_admin_endpoint(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/admin/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access(self):
        response = self.client.get('/api/dashboard-layout/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── device_order in PUT ──

    def test_put_with_device_order(self):
        self.client.force_authenticate(user=self.user)
        data = {**self.valid_layout, "device_order": "type"}
        response = self.client.put('/api/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'type')

    def test_put_without_device_order_keeps_default(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.put('/api/dashboard-layout/', self.valid_layout, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'room')

    def test_admin_put_with_device_order(self):
        self.client.force_authenticate(user=self.admin)
        data = {**self.valid_layout, "device_order": "status"}
        response = self.client.put('/api/admin/dashboard-layout/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'status')

    # ── GET/PATCH /api/device-order/ ──

    def test_device_order_get_default(self):
        """No layout exists, returns default 'room'."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/device-order/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'room')

    def test_device_order_get_from_shared(self):
        """Uses shared layout's device_order when no personal layout."""
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='status',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/device-order/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'status')

    def test_device_order_get_personal_overrides_shared(self):
        """Personal device_order takes priority."""
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='status',
        )
        DashboardLayout.objects.create(
            user=self.user,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device2.id}]},
            device_order='name',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/device-order/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'name')

    def test_device_order_patch_updates_existing(self):
        """PATCH updates device_order on existing personal layout."""
        DashboardLayout.objects.create(
            user=self.user,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='room',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/device-order/', {"device_order": "type"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'type')
        # Verify persisted
        obj = DashboardLayout.objects.get(user=self.user)
        self.assertEqual(obj.device_order, 'type')

    def test_device_order_patch_creates_from_shared(self):
        """PATCH bootstraps personal layout from shared when none exists."""
        DashboardLayout.objects.create(
            user=None,
            layout={"version": 1, "items": [{"type": "device", "deviceId": self.device1.id}]},
            device_order='room',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/device-order/', {"device_order": "name"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'name')
        # A personal layout was created
        obj = DashboardLayout.objects.get(user=self.user)
        self.assertEqual(obj.device_order, 'name')
        self.assertIsNotNone(obj.layout)

    def test_device_order_patch_creates_empty_layout(self):
        """PATCH creates personal layout with empty items when no shared exists."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/device-order/', {"device_order": "status"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_order'], 'status')
        obj = DashboardLayout.objects.get(user=self.user)
        self.assertEqual(obj.layout, {"version": 1, "items": []})

    def test_device_order_patch_invalid_choice(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/device-order/', {"device_order": "invalid"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_device_order_unauthenticated(self):
        response = self.client.get('/api/device-order/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# --- Solar feature tests -------------------------------------------------

from unittest import mock

from .models import SolarSystem
from .solar.client import SolarApiError, SolarDisabled, SolarUnreachable
from .solar.providers.fronius import FroniusProvider


# Sample GetPowerFlowRealtimeData.fcgi payload: hybrid system with battery + meter.
FRONIUS_HYBRID = {
    "Head": {"Status": {"Code": 0, "Reason": "", "UserMessage": ""},
             "Timestamp": "2026-06-04T12:00:00+00:00"},
    "Body": {"Data": {
        "Site": {
            "Mode": "bidirectional",
            "P_Grid": -1500.0,      # exporting 1500 W
            "P_Load": -800.0,       # consuming 800 W (Fronius sign)
            "P_Akku": -500.0,       # charging 500 W (Fronius sign: - = charge)
            "P_PV": 2800.0,
            "rel_SelfConsumption": 46.4,
            "rel_Autonomy": 100.0,
            "E_Day": 12345.0,
            "E_Year": 1234567.0,
            "E_Total": 12345678.0,
            "BatteryStandby": False,
        },
        "Inverters": {"1": {"DT": 1, "P": 2800.0, "SOC": 87.0, "Battery_Mode": "normal"}},
    }},
}

# GEN24 produce-only: no meter, energy counters null.
FRONIUS_PRODUCE_ONLY = {
    "Head": {"Status": {"Code": 0, "Reason": "", "UserMessage": ""},
             "Timestamp": "2026-06-04T12:00:00+00:00"},
    "Body": {"Data": {
        "Site": {
            "Mode": "produce-only",
            "P_Grid": None,
            "P_Load": None,
            "P_Akku": None,
            "P_PV": 1200.0,
            "rel_SelfConsumption": None,
            "rel_Autonomy": None,
            "E_Day": None,
            "E_Year": None,
            "E_Total": None,
        },
        "Inverters": {"1": {"DT": 1, "P": 1200.0}},
    }},
}

FRONIUS_ERROR = {
    "Head": {"Status": {"Code": 255, "Reason": "Internal error", "UserMessage": "Device busy"}},
    "Body": {"Data": {}},
}


class FroniusProviderTest(TestCase):
    """Maps raw Fronius JSON onto the normalized schema (no live network)."""

    def setUp(self):
        self.provider = FroniusProvider('http://fronius.local:9999')

    def test_hybrid_overview_mapping(self):
        with mock.patch('api.solar.providers.fronius.fetch_json', return_value=FRONIUS_HYBRID):
            ov = self.provider.get_overview()

        self.assertTrue(ov['online'])
        self.assertEqual(ov['provider'], 'fronius')
        self.assertEqual(ov['mode'], FroniusProvider.MODE_BIDIRECTIONAL)
        self.assertEqual(ov['power']['solarW'], 2800.0)
        self.assertEqual(ov['power']['gridW'], -1500.0)
        # Load is normalized to positive consumption.
        self.assertEqual(ov['power']['loadW'], 800.0)
        # batteryW is normalized to our schema's + = charging convention.
        self.assertEqual(ov['power']['batteryW'], 500.0)
        self.assertTrue(ov['battery']['present'])
        self.assertEqual(ov['battery']['socPct'], 87.0)
        self.assertEqual(ov['energy']['totalWh'], 12345678.0)
        self.assertTrue(ov['capabilities']['battery'])
        self.assertTrue(ov['capabilities']['meter'])

    def test_produce_only_nulls_and_mode(self):
        with mock.patch('api.solar.providers.fronius.fetch_json', return_value=FRONIUS_PRODUCE_ONLY):
            ov = self.provider.get_overview()

        self.assertEqual(ov['mode'], FroniusProvider.MODE_PRODUCE_ONLY)
        self.assertEqual(ov['power']['solarW'], 1200.0)
        self.assertIsNone(ov['power']['gridW'])
        self.assertIsNone(ov['power']['loadW'])
        self.assertIsNone(ov['energy']['todayWh'])
        self.assertFalse(ov['battery']['present'])
        self.assertFalse(ov['capabilities']['meter'])

    def test_error_envelope_raises(self):
        with mock.patch('api.solar.providers.fronius.fetch_json', return_value=FRONIUS_ERROR):
            with self.assertRaises(SolarApiError):
                self.provider.get_overview()


class SolarSystemAPITest(APITestCase):
    """Tests for SolarSystem CRUD + overview endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(username='soluser', password='TestPass1')
        self.admin = User.objects.create_user(username='soladmin', password='TestPass1')
        self.admin.profile.role = Profile.ROLE_ADMIN
        self.admin.profile.save()
        self.client = APIClient()

    def test_create_requires_admin(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/solar/systems/', {
            'name': 'My PV', 'base_url': 'http://fronius.local:9999', 'provider': 'fronius',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_validates_link(self):
        self.client.force_authenticate(user=self.admin)
        discovery = {'api_version': '1', 'capabilities': {'battery': True, 'meter': True}}
        with mock.patch('api.views_solar.get_provider') as gp:
            gp.return_value.discover.return_value = discovery
            response = self.client.post('/api/solar/systems/', {
                'name': 'My PV', 'base_url': 'http://fronius.local:9999', 'provider': 'fronius',
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SolarSystem.objects.count(), 1)
        self.assertEqual(SolarSystem.objects.first().api_version, '1')

    def test_admin_create_unreachable_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        with mock.patch('api.views_solar.get_provider') as gp:
            gp.return_value.discover.side_effect = SolarUnreachable('nope')
            response = self.client.post('/api/solar/systems/', {
                'name': 'My PV', 'base_url': 'http://bad.local:9999', 'provider': 'fronius',
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('base_url', response.data)

    def test_overview_offline_when_unreachable(self):
        system = SolarSystem.objects.create(
            name='PV', base_url='http://fronius.local:9999', provider='fronius', user=self.admin,
        )
        self.client.force_authenticate(user=self.user)
        with mock.patch('api.views_solar.get_provider') as gp:
            gp.return_value.get_overview.side_effect = SolarUnreachable('down')
            response = self.client.get(f'/api/solar/systems/{system.id}/overview/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['online'])

    def test_overview_disabled_state(self):
        system = SolarSystem.objects.create(
            name='PV', base_url='http://fronius.local:9999', provider='fronius', user=self.admin,
        )
        self.client.force_authenticate(user=self.user)
        with mock.patch('api.views_solar.get_provider') as gp:
            gp.return_value.get_overview.side_effect = SolarDisabled('disabled')
            response = self.client.get(f'/api/solar/systems/{system.id}/overview/')
        self.assertFalse(response.data['online'])
        self.assertIn('disabled', response.data['status']['message'].lower())

    def test_list_accessible_to_any_authenticated(self):
        SolarSystem.objects.create(
            name='PV', base_url='http://fronius.local:9999', provider='fronius', user=self.admin,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/solar/systems/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)

    def test_overview_unauthenticated_denied(self):
        system = SolarSystem.objects.create(
            name='PV', base_url='http://fronius.local:9999', provider='fronius', user=self.admin,
        )
        response = self.client.get(f'/api/solar/systems/{system.id}/overview/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
