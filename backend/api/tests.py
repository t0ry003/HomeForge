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
