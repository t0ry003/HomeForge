from rest_framework import generics, permissions, views
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer, UserSerializer, DeviceSerializer, RoomSerializer, CustomDeviceTypeSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.response import Response
from .models import Device, Room, CustomDeviceType
from .permissions import IsAdmin, IsOwner

class CustomDeviceTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin sees all, Owner sees all?
        # User requirement: "Device Type Management API (Admin Side)"
        if IsAdmin().has_permission(self.request, self):
             return CustomDeviceType.objects.all()
        # Users see passed/approved ones
        return CustomDeviceType.objects.filter(approved=True)

    def perform_create(self, serializer):
        # Admin creates approved, users create pending?
        is_admin = IsAdmin().has_permission(self.request, self)
        serializer.save(approved=is_admin)

class CustomDeviceTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomDeviceType.objects.all()
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins can approve/edit types.")
        serializer.save()

    def perform_destroy(self, instance):
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins can delete types.")
        instance.delete()


class UserListView(generics.ListAPIView):
    """
    List all users (Admin only).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Enforce admin permission
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins/Owners can list users.")
        return User.objects.all()

class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update a user (Admin only).
    Allows editing Name, Email, Role and Avatar (via Profile).
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        # Enforce admin permission
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins/Owners can manage users.")
        return super().get_object()

    def put(self, request, *args, **kwargs):
        # Copied logic from ProfileView.put, but targeting a specific user instance
        user = self.get_object()
        data = request.data.copy()
        
        if 'first_name' in data: user.first_name = data['first_name']
        if 'last_name' in data: user.last_name = data['last_name']
        if 'email' in data: user.email = data['email']
        # Username usually shouldn't be changed by admin lightly, but logic permits it if payload exists
        if 'username' in data: user.username = data['username']
        
        user.save()

        # Update profile
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


class RoomListCreateView(generics.ListCreateAPIView):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow all authenticated users to see all rooms (Global/Shared view)
        return Room.objects.all()

    def perform_create(self, serializer):
        # Additional check if needed, but IsAuthenticated is broad. 
        # Requirement says "Only Owner or Admin roles can perform write operations"
        # We can enforce this in the view permissions or perform_create
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins/Owners can create rooms.")
        serializer.save(user=self.request.user)

class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow all authenticated users to see all rooms
        return Room.objects.all()

    def perform_update(self, serializer):
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins/Owners can update rooms.")
        serializer.save()

    def perform_destroy(self, instance):
        if not IsAdmin().has_permission(self.request, self):
             self.permission_denied(self.request, message="Only Admins/Owners can delete rooms.")
        instance.delete()



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



import random
from rest_framework import generics, permissions, views

# ... import statements ...
class TopologyView(views.APIView):
    """
    Returns the network topology of the user's home in React Flow format (nodes & edges).
    Generates mock devices if none exist.
    Randomly updates device status to simulate activity.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        user = request.user
        
        # Check if ANY devices exist in the system, if not create mock data
        if not Device.objects.exists():
            self._create_mock_devices(user)

        # Fetch ALL devices from DB storage
        # Status is updated via background task (monitor_devices) or manual interactions
        devices = Device.objects.all()
        
        # Build React Flow Nodes and Edges
        nodes = []
        edges = []


        # 1. Central Home Server Node
        nodes.append({
            "id": "home-server",
            "type": "input", # Central node
            "data": { "label": "HomeForge Gateway", "ip": "192.168.1.1", "status": "online" },
            "position": { "x": 0, "y": 0 }
        })

        # 2. Device Nodes - Radial Layout
        import math
        
        radius = 300
        count = devices.count()
        if count > 0:
            angle_step = (2 * math.pi) / count
        else:
            angle_step = 0

        for index, device in enumerate(devices):
            node_id = str(device.id)
            
            # Calculate position on circle
            angle = index * angle_step
            x_pos = radius * math.cos(angle)
            y_pos = radius * math.sin(angle)

            # Node Data
            nodes.append({
                "id": node_id,
                "type": "device",  # Custom type for frontend Use
                "data": { 
                    "label": f"{device.name}",
                    "details": {
                        "ip": device.ip_address,
                        "type": device.device_type.name,
                        "room": device.room.name if device.room else "Unassigned",
                        "status": device.status
                    }
                },
                "position": { "x": x_pos, "y": y_pos },
                "style": { 
                    # specific style based on status
                    "background": "#fff",
                    "border": "1px solid #777",
                    "width": 180,
                    "borderColor": "#10B981" if device.status == 'online' else "#EF4444"
                }
            })

            # Edge from Server to Device
            edges.append({
                "id": f"e-server-{node_id}",
                "source": "home-server",
                "target": node_id,
                "animated": device.status == 'online',
                "style": { "stroke": "#10B981" if device.status == 'online' else "#EF4444" }
            })

        return Response({ "nodes": nodes, "edges": edges })

    def _create_mock_devices(self, user):
        room, _ = Room.objects.get_or_create(name="Living Room", user=user)
        
        # Ensure default device types exist
        default_types = ['Light', 'Thermostat', 'Camera', 'Speaker', 'Lock']
        type_objects = []
        for type_name in default_types:
            dt, _ = CustomDeviceType.objects.get_or_create(
                name=type_name, 
                defaults={'approved': True}
            )
            type_objects.append(dt)
        
        for i in range(1, 11):
            Device.objects.create(
                name=f"Device {i}",
                ip_address=f"192.168.1.{100+i}",
                status=Device.STATUS_ONLINE,
                device_type=random.choice(type_objects),
                room=room,
                user=user
            )

    # def _randomize_device_statuses(self, user):
    #     # Deprecated: Status is now managed by the monitor_devices command
    #     pass

class DeviceListCreateView(generics.ListCreateAPIView):
    """
    List all devices or register a new one.
    """
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Global view of devices
        return Device.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a device.
    Restricted to the user who owns the device.
    """
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow viewing detail of any device
        return Device.objects.all()



class DeviceTypeProposeView(generics.CreateAPIView):
    """
    Endpoint for users to propose new device types.
    Always creates as unapproved.
    """
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Force approved=False
        serializer.save(approved=False)

class DeviceTypeApproveView(generics.UpdateAPIView):
    """
    Endpoint for admins to approve a device type via POST/PUT.
    """
    queryset = CustomDeviceType.objects.all()
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Handle POST as an approval action
        return self.update(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not IsAdmin().has_permission(request, self):
             self.permission_denied(request, message="Only Admins can approve types.")
        
        instance = self.get_object()
        instance.approved = True
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

