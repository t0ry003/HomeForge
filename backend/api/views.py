from rest_framework import generics, permissions, views
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer, UserSerializer, DeviceSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from rest_framework.response import Response
from .models import Device, Room
import random


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)  # Anyone may register
    serializer_class = RegisterSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated user's profile (avatar/role)."""
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        user = self.request.user
        # Ensure profile exists before returning
        if not hasattr(user, 'profile'):
            from .models import Profile
            Profile.objects.get_or_create(user=user)
        return user

    def put(self, request, *args, **kwargs):
        # Allow updating first/last name, email, username, password and uploading avatar
        user = request.user
        data = request.data.copy()
        
        # Update basic user fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'username' in data:
            user.username = data['username']
        
        # Handle password change
        password = data.get('password')
        if password:
            user.set_password(password)

        user.save()

        # Handle avatar upload and role change on the related profile
        profile = getattr(user, 'profile', None)
        if profile is None:
            from .models import Profile
            profile, _ = Profile.objects.get_or_create(user=user)

        avatar = request.FILES.get('avatar')
        if avatar:
            profile.avatar = avatar

        role = data.get('role')
        if role:
            profile.role = role

        accent_color = data.get('accent_color')
        if accent_color:
            profile.accent_color = accent_color

        profile.save()

        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_200_OK)


class TopologyView(views.APIView):
    """
    Returns the network topology of the user's home.
    Generates mock devices if none exist.
    Randomly updates device status to simulate activity.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        
        # Check if user has devices, if not create mock data
        if not Device.objects.filter(user=user).exists():
            self._create_mock_devices(user)

        # Randomly update status of some devices
        self._randomize_device_statuses(user)

        # Fetch devices
        devices = Device.objects.filter(user=user)
        device_serializer = DeviceSerializer(devices, many=True)

        # Construct Topology
        topology = {
            "name": "Home Server",
            "ip": "192.168.1.1",
            "type": "server",
            "status": "online",
            "children": device_serializer.data
        }

        return Response(topology)

    def _create_mock_devices(self, user):
        # Create a default room
        room, _ = Room.objects.get_or_create(name="Living Room", user=user)
        
        device_types = ['light', 'thermostat', 'camera', 'speaker', 'lock']
        
        for i in range(1, 11):
            Device.objects.create(
                name=f"Device {i}",
                ip_address=f"192.168.1.{100+i}",
                status=Device.STATUS_ONLINE,
                device_type=random.choice(device_types),
                room=room,
                user=user
            )

    def _randomize_device_statuses(self, user):
        # Randomly flip status of ~30% of devices
        devices = Device.objects.filter(user=user)
        for device in devices:
            if random.random() < 0.3:
                new_status = Device.STATUS_OFFLINE if device.status == Device.STATUS_ONLINE else Device.STATUS_ONLINE
                device.status = new_status
                device.save()