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
    Returns the network topology of the home environment.
    Visualizes the HomeForge Server connected to all registered devices.
    Uses a radial layout for visualization.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        import math # Ensure math is imported
        user = request.user
        
        # 1. Ensure Data Exists (Mock if empty for demo purposes)
        if not Device.objects.exists():
            self._create_mock_data(user)

        # 2. Fetch Devices
        devices = Device.objects.all()

        nodes = []
        edges = []
        
        # 3. Create Central Server Node (The "Hub")
        gateway_id = "homeforge-gateway"
        nodes.append({
            "id": gateway_id,
            "type": "input", # Central input node
            "data": { 
                "label": "HomeForge Gateway",
                "ip": "192.168.1.1",
                "status": "online",
                "type": "server",
                "room": "Server Room"
            },
            "position": { "x": 0, "y": 0 },
            "style": { 
                "background": "#F3F4F6", 
                "color": "#1F2937", 
                "border": "2px solid #3B82F6",
                "borderRadius": "8px",
                "fontWeight": "bold"
            }
        })

        # 4. Generate Device Nodes (Spokes)
        # Layout: Radial positioning around the gateway
        radius = 350 # Distance from center
        device_count = devices.count()
        
        for index, device in enumerate(devices):
            # Calculate position on circle
            angle = (2 * math.pi * index) / device_count if device_count > 0 else 0
            x_pos = radius * math.cos(angle)
            y_pos = radius * math.sin(angle)
            
            node_id = str(device.id)
            
            # Identify Status Color
            status_color = "#10B981" if device.status == Device.STATUS_ONLINE else "#EF4444"
            if device.status == Device.STATUS_ERROR:
                status_color = "#F59E0B"

            # Node Data
            nodes.append({
                "id": node_id,
                "type": "device", # Custom frontend node type recommended
                "data": { 
                    "label": device.name,
                    "ip": device.ip_address,
                    "status": device.status,
                    "room": device.room.name if device.room else "Unassigned",
                    "device_type": device.device_type.name if device.device_type else "Unknown",
                    "icon": device.icon,
                    "current_state": device.current_state
                },
                "position": { "x": x_pos, "y": y_pos },
                # Fallback style if custom node is not used in frontend
                "style": {
                    "width": 180,
                    "borderColor": status_color,
                    "borderWidth": "1px",
                    "borderStyle": "solid",
                    "padding": "10px",
                    "borderRadius": "5px",
                    "background": "white"
                }
            })

            # 5. Create Connection (Edge)
            edges.append({
                "id": f"edge-{gateway_id}-{node_id}",
                "source": gateway_id,
                "target": node_id,
                "animated": device.status == Device.STATUS_ONLINE, # Animate only if active
                "style": { 
                    "stroke": status_color,
                    "strokeWidth": 2
                },
            })

        return Response({ "nodes": nodes, "edges": edges })

    def _create_mock_data(self, user):
        """Helper to seed DB with data if completely empty."""
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
        
        for i in range(1, 9):
            d_type = random.choice(type_objects)
            Device.objects.create(
                name=f"{d_type.name} {i:02d}",
                ip_address=f"192.168.1.{100+i}",
                status=random.choice([Device.STATUS_ONLINE, Device.STATUS_OFFLINE]),
                device_type=d_type,
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



class DeviceStateUpdateView(views.APIView):
    """
    PATCH /api/devices/{pk}/state/
    Update the current_state of a device.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            device = Device.objects.get(pk=pk)
        except Device.DoesNotExist:
            return Response({"detail": "Device not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check ownership
        if device.user != request.user and not IsAdmin().has_permission(request, self):
            return Response({"detail": "You do not own this device."}, status=status.HTTP_403_FORBIDDEN)

        new_state = request.data
        if not isinstance(new_state, dict):
             return Response({"detail": "State must be a JSON object."}, status=status.HTTP_400_BAD_REQUEST)

        # Merge new state into existing state
        current = device.current_state
        current.update(new_state)
        # Note: If we need deep merge later, we can implement it. For now, top-level keys update.
        
        device.current_state = current
        
        # SIMULATION LOGIC:
        # If the backend successfully receives a command, we assume the device is reachable/active for now.
        # This mocks the behavior of a successful acknowledgment.
        device.status = Device.STATUS_ONLINE
        
        device.save()

        # Future Hook: Sync with hardware
        self.sync_with_hardware(device, new_state)

        return Response({
            "status": "State updated", 
            "device_status": device.status,
            "current_state": device.current_state
        })

    def sync_with_hardware(self, device, state_changes):
        """
        Placeholder for future MQTT/API logic.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"HARDWARE SYNC: Device {device.id} ({device.ip_address}) -> {state_changes}")
        # Logic to publish to MQTT topic would go here
        # topic = f"homeforge/devices/{device.id}/set"
        # mqtt_client.publish(topic, json.dumps(state_changes))

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


class AdminPendingDeviceTypeListView(generics.ListAPIView):
    """
    Admin: Get all pending (unapproved) device types with full details.
    """
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not IsAdmin().has_permission(self.request, self):
            self.permission_denied(self.request, message="Only Admins can view pending types.")
        return CustomDeviceType.objects.filter(approved=False)


class AdminDeviceTypeReviewView(views.APIView):
    """
    Admin: Approve or Deny a device type.
    POST /approve/ -> Sets approved=True
    POST /deny/ -> Sets rejection_reason
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        if not IsAdmin().has_permission(request, self):
             return Response({"detail": "Only Admins can review types."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            instance = CustomDeviceType.objects.get(pk=pk)
        except CustomDeviceType.DoesNotExist:
            return Response({"detail": "Device Type not found."}, status=status.HTTP_404_NOT_FOUND)

        if action == 'approve':
            instance.approved = True
            instance.rejection_reason = None # Clear any previous rejection
            instance.save()
            return Response({"status": "Approved", "data": CustomDeviceTypeSerializer(instance).data})

        elif action == 'deny':
            reason = request.data.get('reason')
            if not reason:
                return Response({"reason": ["This field is required for denial."]}, status=status.HTTP_400_BAD_REQUEST)
            
            instance.approved = False
            instance.rejection_reason = reason
            instance.save()
            return Response({"status": "Denied", "data": CustomDeviceTypeSerializer(instance).data})
        
        return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)


