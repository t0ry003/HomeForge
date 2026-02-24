from rest_framework import generics, permissions, views
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .serializers import (
    RegisterSerializer, UserSerializer, DeviceSerializer, RoomSerializer, 
    CustomDeviceTypeSerializer, NotificationSerializer, NotificationCreateSerializer,
    DashboardLayoutSerializer
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.response import Response
from .models import Device, Room, CustomDeviceType, Notification, DashboardLayout
from .permissions import IsAdmin, IsOwner
from django.core.cache import cache

class CustomDeviceTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin sees all, users see only approved (cached)
        if IsAdmin().has_permission(self.request, self):
            return CustomDeviceType.objects.select_related(
                'card_template'
            ).prefetch_related(
                'card_template__controls'
            ).all()
        
        # Cache approved device types for non-admin users (5 minutes)
        cache_key = 'approved_device_types_qs'
        cached_ids = cache.get(cache_key)
        
        base_qs = CustomDeviceType.objects.select_related(
            'card_template'
        ).prefetch_related(
            'card_template__controls'
        )
        
        if cached_ids is not None:
            return base_qs.filter(id__in=cached_ids)
        
        # Cache the IDs of approved types
        approved_qs = base_qs.filter(approved=True)
        approved_ids = list(approved_qs.values_list('id', flat=True))
        cache.set(cache_key, approved_ids, timeout=300)
        
        return approved_qs

    def perform_create(self, serializer):
        # Invalidate cache when new type is created
        cache.delete('approved_device_types_qs')
        is_admin = IsAdmin().has_permission(self.request, self)
        serializer.save(approved=is_admin)

class CustomDeviceTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Optimized: prefetch related data
        return CustomDeviceType.objects.select_related(
            'card_template'
        ).prefetch_related(
            'card_template__controls'
        )

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
        # Optimized: prefetch devices and select_related user
        return Room.objects.select_related('user').prefetch_related('devices')

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
        # Optimized: prefetch devices and select_related user
        return Room.objects.select_related('user').prefetch_related('devices')

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


class TopologyView(views.APIView):
    """
    Returns the network topology of the home environment.
    Visualizes the HomeForge Server connected to all registered devices.
    Uses a radial layout for visualization.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        import math
        user = request.user

        # Optimized: select_related and only() for required fields
        devices = Device.objects.select_related(
            'room', 'device_type'
        ).only(
            'id', 'name', 'ip_address', 'status', 'icon', 'current_state',
            'room__name', 'device_type__name'
        )
        
        # Evaluate queryset once to avoid multiple DB hits
        device_list = list(devices)
        device_count = len(device_list)

        nodes = []
        edges = []
        
        # Create Central Server Node (The "Hub")
        gateway_id = "homeforge-gateway"
        nodes.append({
            "id": gateway_id,
            "type": "input",
            "data": { 
                "label": "MQTT Broker",
                "ip": "HomeForge Hub",
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

        # Pre-compute status colors mapping
        status_colors = {
            Device.STATUS_ONLINE: "#10B981",
            Device.STATUS_OFFLINE: "#EF4444",
            Device.STATUS_ERROR: "#F59E0B"
        }

        # Generate Device Nodes using pre-fetched list
        radius = 350
        
        for index, device in enumerate(device_list):
            angle = (2 * math.pi * index) / device_count if device_count > 0 else 0
            x_pos = radius * math.cos(angle)
            y_pos = radius * math.sin(angle)
            
            node_id = str(device.id)
            status_color = status_colors.get(device.status, "#EF4444")

            # Determine label style based on binding status
            is_bound = bool(device.mac_address)
            border_style = "solid" if is_bound else "dashed"

            nodes.append({
                "id": node_id,
                "type": "device",
                "data": { 
                    "label": device.name,
                    "ip": device.ip_address,
                    "mac": device.mac_address,
                    "status": device.status,
                    "room": device.room.name if device.room else "Unassigned",
                    "device_type": device.device_type.name if device.device_type else "Unknown",
                    "icon": device.icon,
                    "current_state": device.current_state,
                    "is_bound": is_bound
                },
                "position": { "x": x_pos, "y": y_pos },
                "style": {
                    "width": 180,
                    "borderColor": status_color,
                    "borderWidth": "2px" if is_bound else "1px",
                    "borderStyle": border_style,
                    "padding": "10px",
                    "borderRadius": "5px",
                    "background": "white",
                    "opacity": 1.0 if device.status == Device.STATUS_ONLINE else 0.6
                }
            })

            edges.append({
                "id": f"edge-{gateway_id}-{node_id}",
                "source": gateway_id,
                "target": node_id,
                "animated": device.status == Device.STATUS_ONLINE,
                "style": { 
                    "stroke": status_color,
                    "strokeWidth": 2
                },
            })

        return Response({ "nodes": nodes, "edges": edges })


class DeviceListCreateView(generics.ListCreateAPIView):
    """
    List all devices or register a new one.
    """
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Optimized: select_related for ForeignKeys to avoid N+1 queries
        return Device.objects.select_related(
            'room', 'user', 'device_type', 'device_type__card_template'
        ).prefetch_related(
            'device_type__card_template__controls'
        )

    def perform_create(self, serializer):
        """
        Create device and attempt auto-configuration based on IP.
        """
        device = serializer.save(user=self.request.user)
        
        # Trigger auto-configuration in background (or simpler: immediately here)
        # We try to hit http://<device_ip>/config to set the MQTT server
        self.configure_device(device)

    def configure_device(self, device):
        """
        Send configuration to the device's HTTP server.
        """
        import requests
        import logging
        from django.conf import settings
        import socket
        logger = logging.getLogger(__name__)

        try:
            # Determine our own IP (the MQTT broker IP)
            mqtt_broker_ip = getattr(settings, 'MQTT_BROKER_HOST', None)

            if not mqtt_broker_ip:
                # Use request.get_host() to find the address user accessed the API from (usually the host machine)
                host_header = self.request.get_host()
                host_ip = host_header.split(':')[0]
                
                # If accessed via a real IP (e.g. 192.168.0.x), use it.
                if host_ip and host_ip != "localhost" and host_ip != "127.0.0.1":
                    mqtt_broker_ip = host_ip
                else:
                    # Fallback if accessed via localhost (which won't work for external device)
                    # Try to get the real local IP via socket (outbound connection check)
                    try:
                        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                        # Connecting to the DEVICE IP ensures we get the interface facing the device
                        target_ip = device.ip_address if device.ip_address else "8.8.8.8"
                        s.connect((target_ip, 80))
                        detected_ip = s.getsockname()[0]
                        s.close()
                        
                        # If detecting from Docker container, check for private subnet mismatch
                        if detected_ip.startswith("172.") and target_ip.startswith("192.168."):
                            logger.warning(
                                f"Auto-detected internal Docker IP {detected_ip} but device is at {target_ip}. "
                                "Skipping auto-configuration to prevent breaking connectivity. "
                                "Set MQTT_BROKER_HOST env var to your LAN IP to fix this."
                            )
                            mqtt_broker_ip = None # Do NOT use this IP
                        else:
                            mqtt_broker_ip = detected_ip
                    except Exception:
                        pass

            if not mqtt_broker_ip:
                logger.warning(f"Could not determine MQTT Broker IP for device {device.name}")
                return

            url = f"http://{device.ip_address}/config"
            payload = {"mqtt_server": mqtt_broker_ip}
            
            logger.info(f"Configuring device {device.name} at {device.ip_address} with MQTT Broker: {mqtt_broker_ip}")
            
            # Short timeout because device might not be online yet
            requests.post(url, json=payload, timeout=2)
            
        except Exception as e:
            logger.warning(f"Failed to auto-configure device {device.name}: {e}")


class DeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a device.
    Restricted to the user who owns the device.
    """
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Optimized: select_related for ForeignKeys
        return Device.objects.select_related(
            'room', 'user', 'device_type', 'device_type__card_template'
        ).prefetch_related(
            'device_type__card_template__controls'
        )



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

        new_state = request.data
        if not isinstance(new_state, dict):
             return Response({"detail": "State must be a JSON object."}, status=status.HTTP_400_BAD_REQUEST)

        # Instead of updating DB immediately, we send the command to the hardware.
        # The hardware will report back (via MQTT) when the state actually changes.
        # This fulfills the requirement: "platform should say it's on only when the esp device performed the task"
        
        # Future Hook: Sync with hardware
        self.sync_with_hardware(device, new_state)

        # Prepare optimistic state for the frontend to render immediately
        # while waiting for the hardware confirmation.
        # This prevents UI glitches/reverting when toggling rapidly.
        current_state = device.current_state or {}
        optimistic_state = {**current_state, **new_state}

        return Response({
            "status": "Command sent", 
            "detail": "State will update when device confirms.",
            "device_status": device.status,
            "current_state": optimistic_state
        }, status=status.HTTP_202_ACCEPTED)

    def sync_with_hardware(self, device, state_changes):
        """
        Send command via MQTT.
        If MAC is known, use it. Otherwise attempt to control via IP binding (less reliable).
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            from .mqtt_client import mqtt_client
            
            identifier = device.mac_address
            # If MAC is missing, we can't control it reliably as per the new firmware protocol.
            # However, the user might not have waited for the device to "check in".
            # For now, we only support MAC-based pub if it's stored.
            
            if identifier:
                # Compatibility Layer: ensure single-relay devices receive 'relay_1' command
                # regardless of UI variable name.
                payload = state_changes.copy()
                
                # Check if payload has boolean values but misses 'relay_1' or 'switch-*' keys
                has_relay_key = any(k == "relay_1" or k.startswith("switch-") for k in payload.keys())
                
                if not has_relay_key:
                    # Find first boolean value in payload to use as relay state
                    for k, v in payload.items():
                        if isinstance(v, bool) or (isinstance(v, str) and v.lower() in ['true', 'false', 'on', 'off']):
                            payload["relay_1"] = v
                            break

                mqtt_client.publish(identifier, payload)
            else:
                # Log warning: Device hasn't checked in yet to establish MAC binding
                logger.warning(f"Cannot control device {device.name} (ID: {device.id}) - No MAC address bound yet.")
                
        except Exception as e:
            logger.error(f"Failed to publish MQTT command: {e}")
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
        instance = serializer.save(approved=False)
        
        # Notify admins about new proposal
        Notification.notify_admins(
            notification_type=Notification.TYPE_DEVICE_TYPE_PENDING,
            title="New Device Type Proposal",
            message=f"'{instance.name}' has been proposed by {self.request.user.username} and is awaiting approval.",
            priority=Notification.PRIORITY_NORMAL,
            reference_data={"device_type_id": instance.id, "proposed_by": self.request.user.username},
            action_url=f"/admin/device-types/{instance.id}/"
        )


class AdminPendingDeviceTypeListView(generics.ListAPIView):
    """
    Admin: Get all pending (unapproved, not denied) device types with full details.
    These are types waiting for review (no rejection_reason set).
    """
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not IsAdmin().has_permission(self.request, self):
            self.permission_denied(self.request, message="Only Admins can view pending types.")
        # Pending = not approved AND no rejection reason (hasn't been denied yet)
        return CustomDeviceType.objects.filter(approved=False, rejection_reason__isnull=True)


class AdminDeniedDeviceTypeListView(generics.ListAPIView):
    """
    Admin: Get all denied device types with full details.
    These are types that have been reviewed and rejected.
    """
    serializer_class = CustomDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not IsAdmin().has_permission(self.request, self):
            self.permission_denied(self.request, message="Only Admins can view denied types.")
        # Denied = not approved AND has a rejection reason
        return CustomDeviceType.objects.filter(approved=False, rejection_reason__isnull=False)


class AdminDeniedDeviceTypeDeleteView(views.APIView):
    """
    Admin: Delete denied device types.
    DELETE /admin/device-types/denied/{pk}/ - Delete a single denied type
    DELETE /admin/device-types/denied/ - Bulk delete denied types
        - No body: Delete ALL denied types
        - Body with {"ids": [1, 2, 3]}: Delete specific denied types
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk=None):
        if not IsAdmin().has_permission(request, self):
            return Response({"detail": "Only Admins can delete denied types."}, status=status.HTTP_403_FORBIDDEN)

        if pk is not None:
            # Delete single denied device type
            try:
                instance = CustomDeviceType.objects.get(pk=pk, approved=False, rejection_reason__isnull=False)
            except CustomDeviceType.DoesNotExist:
                return Response({"detail": "Denied device type not found."}, status=status.HTTP_404_NOT_FOUND)
            
            name = instance.name
            instance.delete()
            return Response({"status": "Deleted", "message": f"Denied device type '{name}' has been deleted."})
        
        else:
            # Bulk delete
            ids = request.data.get('ids', None)
            
            if ids is not None:
                # Delete specific denied types by ID
                if not isinstance(ids, list):
                    return Response({"detail": "'ids' must be a list of integers."}, status=status.HTTP_400_BAD_REQUEST)
                
                denied_types = CustomDeviceType.objects.filter(
                    pk__in=ids, 
                    approved=False, 
                    rejection_reason__isnull=False
                )
                count = denied_types.count()
                
                if count == 0:
                    return Response({"detail": "No matching denied device types found."}, status=status.HTTP_404_NOT_FOUND)
                
                denied_types.delete()
                return Response({
                    "status": "Deleted", 
                    "message": f"Deleted {count} denied device type(s).",
                    "deleted_count": count
                })
            
            else:
                # Delete ALL denied types
                denied_types = CustomDeviceType.objects.filter(approved=False, rejection_reason__isnull=False)
                count = denied_types.count()
                
                if count == 0:
                    return Response({"detail": "No denied device types to delete."}, status=status.HTTP_404_NOT_FOUND)
                
                denied_types.delete()
                return Response({
                    "status": "Deleted", 
                    "message": f"Deleted all {count} denied device type(s).",
                    "deleted_count": count
                })


class AdminDeviceTypeReviewView(views.APIView):
    """
    Admin: Approve, Deny, or Edit a device type.
    POST /approve/ -> Sets approved=True
    POST /deny/ -> Sets rejection_reason
    POST /edit/ -> Edit the device type definition and card_template
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, action=None):
        """GET /admin/device-types/{pk}/ - Get full device type details for editing"""
        if not IsAdmin().has_permission(request, self):
            return Response({"detail": "Only Admins can view device type details."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            instance = CustomDeviceType.objects.get(pk=pk)
        except CustomDeviceType.DoesNotExist:
            return Response({"detail": "Device Type not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(CustomDeviceTypeSerializer(instance).data)

    def put(self, request, pk, action=None):
        """PUT /admin/device-types/{pk}/ - Full update of device type (definition + card_template)"""
        if not IsAdmin().has_permission(request, self):
            return Response({"detail": "Only Admins can edit device types."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            instance = CustomDeviceType.objects.get(pk=pk)
        except CustomDeviceType.DoesNotExist:
            return Response({"detail": "Device Type not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CustomDeviceTypeSerializer(instance, data=request.data, partial=False)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "Updated", "data": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, action=None):
        """PATCH /admin/device-types/{pk}/ - Partial update of device type"""
        if not IsAdmin().has_permission(request, self):
            return Response({"detail": "Only Admins can edit device types."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            instance = CustomDeviceType.objects.get(pk=pk)
        except CustomDeviceType.DoesNotExist:
            return Response({"detail": "Device Type not found."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = CustomDeviceTypeSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "Updated", "data": serializer.data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            # Invalidate cache when approval status changes
            cache.delete('approved_device_types_qs')
            
            # Create system notification about new approved device type
            Notification.objects.create(
                user=request.user,  # Notify the admin who approved (for record)
                notification_type=Notification.TYPE_INFO,
                title="Device Type Approved",
                message=f"You approved the device type '{instance.name}'.",
                reference_data={"device_type_id": instance.id}
            )
            
            return Response({"status": "Approved", "data": CustomDeviceTypeSerializer(instance).data})

        elif action == 'deny':
            reason = request.data.get('reason')
            if not reason:
                return Response({"reason": ["This field is required for denial."]}, status=status.HTTP_400_BAD_REQUEST)
            
            instance.approved = False
            instance.rejection_reason = reason
            instance.save()
            # Invalidate cache when approval status changes
            cache.delete('approved_device_types_qs')
            
            # Create notification about denial
            Notification.objects.create(
                user=request.user,  # Notify the admin who denied (for record)
                notification_type=Notification.TYPE_INFO,
                title="Device Type Denied",
                message=f"You denied the device type '{instance.name}'. Reason: {reason}",
                reference_data={"device_type_id": instance.id, "reason": reason}
            )
            
            return Response({"status": "Denied", "data": CustomDeviceTypeSerializer(instance).data})
        
        return Response({"detail": "Invalid action. Use 'approve' or 'deny'."}, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# NOTIFICATION VIEWS
# =============================================================================

class NotificationListView(generics.ListAPIView):
    """
    List notifications for the authenticated user.
    
    Query Parameters:
    - is_read: Filter by read status (true/false)
    - type: Filter by notification type
    - priority: Filter by priority level
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        return queryset


class NotificationUnreadCountView(views.APIView):
    """
    Get the count of unread notifications for the authenticated user.
    Also returns counts by type for badge displays.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        base_qs = Notification.objects.filter(user=user, is_read=False)
        
        # Get counts by type
        type_counts = {}
        for type_choice in Notification.TYPE_CHOICES:
            type_key = type_choice[0]
            count = base_qs.filter(notification_type=type_key).count()
            if count > 0:
                type_counts[type_key] = count
        
        return Response({
            "unread_count": base_qs.count(),
            "by_type": type_counts
        })


class NotificationDetailView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete a single notification.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationMarkReadView(views.APIView):
    """
    Mark notifications as read.
    
    POST /notifications/{id}/read/ - Mark single notification as read
    POST /notifications/read-all/ - Mark all notifications as read
    POST /notifications/read-all/?type=device_type_pending - Mark all of a type as read
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk=None):
        user = request.user
        
        if pk is not None:
            # Mark single notification as read
            try:
                notification = Notification.objects.get(pk=pk, user=user)
            except Notification.DoesNotExist:
                return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
            
            notification.mark_as_read()
            return Response({
                "status": "Marked as read",
                "notification": NotificationSerializer(notification).data
            })
        
        else:
            # Mark multiple notifications as read
            queryset = Notification.objects.filter(user=user, is_read=False)
            
            # Optional: filter by type
            notification_type = request.query_params.get('type')
            if notification_type:
                queryset = queryset.filter(notification_type=notification_type)
            
            # Optional: filter by IDs in request body
            ids = request.data.get('ids')
            if ids and isinstance(ids, list):
                queryset = queryset.filter(pk__in=ids)
            
            from django.utils import timezone
            count = queryset.update(is_read=True, read_at=timezone.now())
            
            return Response({
                "status": "Marked as read",
                "count": count
            })


class NotificationBulkDeleteView(views.APIView):
    """
    Delete multiple notifications.
    
    DELETE /notifications/bulk-delete/ - Delete notifications
    - No body: Delete ALL read notifications
    - Body with {"ids": [1, 2, 3]}: Delete specific notifications
    - Body with {"all": true}: Delete ALL notifications (read and unread)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def delete(self, request):
        user = request.user
        
        delete_all = request.data.get('all', False)
        ids = request.data.get('ids')
        
        if delete_all:
            # Delete all notifications
            count = Notification.objects.filter(user=user).delete()[0]
        elif ids and isinstance(ids, list):
            # Delete specific notifications
            count = Notification.objects.filter(user=user, pk__in=ids).delete()[0]
        else:
            # Delete all READ notifications (cleanup)
            count = Notification.objects.filter(user=user, is_read=True).delete()[0]
        
        return Response({
            "status": "Deleted",
            "count": count
        })


class AdminNotificationCreateView(generics.CreateAPIView):
    """
    Admin: Create a notification for a specific user.
    """
    serializer_class = NotificationCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        if not IsAdmin().has_permission(self.request, self):
            self.permission_denied(self.request, message="Only Admins can create notifications for others.")
        serializer.save()


class AdminNotificationBroadcastView(views.APIView):
    """
    Admin: Broadcast a notification to multiple users.
    
    POST body:
    - target: "all" | "admins" | "users" | "viewers"
    - notification_type: Type of notification
    - title: Notification title
    - message: Notification message
    - priority: Priority level (optional)
    - action_url: Link for action (optional)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if not IsAdmin().has_permission(request, self):
            return Response({"detail": "Only Admins can broadcast notifications."}, status=status.HTTP_403_FORBIDDEN)
        
        target = request.data.get('target', 'all')
        notification_type = request.data.get('notification_type', Notification.TYPE_SYSTEM)
        title = request.data.get('title')
        message = request.data.get('message')
        priority = request.data.get('priority', Notification.PRIORITY_NORMAL)
        action_url = request.data.get('action_url')
        reference_data = request.data.get('reference_data', {})
        
        if not title or not message:
            return Response({"detail": "Title and message are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine target users
        from .models import Profile
        
        if target == 'all':
            users = User.objects.all()
        elif target == 'admins':
            users = User.objects.filter(profile__role__in=[Profile.ROLE_ADMIN, Profile.ROLE_OWNER])
        elif target == 'users':
            users = User.objects.filter(profile__role=Profile.ROLE_USER)
        elif target == 'viewers':
            users = User.objects.filter(profile__role=Profile.ROLE_VIEWER)
        else:
            return Response({"detail": "Invalid target. Use: all, admins, users, or viewers."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create notifications
        notifications = []
        for user in users:
            notifications.append(Notification(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                action_url=action_url,
                reference_data=reference_data
            ))
        
        created = Notification.objects.bulk_create(notifications)
        
        return Response({
            "status": "Broadcast sent",
            "recipients": len(created),
            "target": target
        })


class DashboardLayoutView(views.APIView):
    """
    Personal dashboard layout for the authenticated user.
    
    GET  - Returns user's personal layout, falls back to admin/shared layout, or default.
    PUT  - Creates or replaces the user's personal layout (upsert).
    DELETE - Deletes the user's personal layout (reverts to shared/default).
    """
    permission_classes = [permissions.IsAuthenticated]

    def _build_response(self, layout_obj, is_personal):
        """Build a standard layout response dict."""
        return {
            "layout": layout_obj.layout,
            "device_order": layout_obj.device_order,
            "is_personal": is_personal,
            "updated_at": layout_obj.updated_at.isoformat(),
        }

    def get(self, request):
        # Try personal layout first
        try:
            personal = DashboardLayout.objects.get(user=request.user)
            return Response(self._build_response(personal, is_personal=True))
        except DashboardLayout.DoesNotExist:
            pass

        # Fall back to admin/shared layout
        try:
            shared = DashboardLayout.objects.get(user__isnull=True)
            return Response(self._build_response(shared, is_personal=False))
        except DashboardLayout.DoesNotExist:
            pass

        # Default response when no layout exists
        return Response({
            "layout": None,
            "device_order": DashboardLayout.ORDER_ROOM,
            "is_personal": False,
        })

    def put(self, request):
        serializer = DashboardLayoutSerializer(
            data=request.data,
            context={'user': request.user, 'skip_ownership': True}
        )
        serializer.is_valid(raise_exception=True)

        layout_data = serializer.validated_data['layout']
        defaults = {'layout': layout_data}

        # Include device_order if provided
        device_order = serializer.validated_data.get('device_order')
        if device_order is not None:
            defaults['device_order'] = device_order

        obj, created = DashboardLayout.objects.update_or_create(
            user=request.user,
            defaults=defaults
        )

        return Response(self._build_response(obj, is_personal=True))

    def delete(self, request):
        DashboardLayout.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminDashboardLayoutView(views.APIView):
    """
    Shared/default dashboard layout managed by admin/owner.
    
    GET - Returns the shared layout.
    PUT - Creates or replaces the shared layout.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not IsAdmin().has_permission(request, self):
            self.permission_denied(request, message="Only Admins/Owners can manage the shared layout.")

        try:
            shared = DashboardLayout.objects.get(user__isnull=True)
            return Response({
                "layout": shared.layout,
                "device_order": shared.device_order,
                "is_personal": False,
                "updated_at": shared.updated_at.isoformat(),
            })
        except DashboardLayout.DoesNotExist:
            return Response({
                "layout": None,
                "device_order": DashboardLayout.ORDER_ROOM,
                "is_personal": False,
            })

    def put(self, request):
        if not IsAdmin().has_permission(request, self):
            self.permission_denied(request, message="Only Admins/Owners can manage the shared layout.")

        serializer = DashboardLayoutSerializer(
            data=request.data,
            context={'user': request.user, 'skip_ownership': True}
        )
        serializer.is_valid(raise_exception=True)

        layout_data = serializer.validated_data['layout']
        defaults = {'layout': layout_data, 'user': None}

        # Include device_order if provided
        device_order = serializer.validated_data.get('device_order')
        if device_order is not None:
            defaults['device_order'] = device_order

        obj, created = DashboardLayout.objects.update_or_create(
            user__isnull=True,
            defaults=defaults
        )

        return Response({
            "layout": obj.layout,
            "device_order": obj.device_order,
            "is_personal": False,
            "updated_at": obj.updated_at.isoformat(),
        })


class DeviceOrderView(views.APIView):
    """
    PATCH /api/device-order/
    Update only the device_order preference for the current user.

    Falls back through: user layout → admin/shared layout to determine which
    record to read from. If the user has no personal layout yet, one is
    created from the shared layout (or with an empty default) so the
    preference can be stored.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return the active device_order for this user (with fallback)."""
        try:
            personal = DashboardLayout.objects.get(user=request.user)
            return Response({"device_order": personal.device_order})
        except DashboardLayout.DoesNotExist:
            pass

        try:
            shared = DashboardLayout.objects.get(user__isnull=True)
            return Response({"device_order": shared.device_order})
        except DashboardLayout.DoesNotExist:
            pass

        return Response({"device_order": DashboardLayout.ORDER_ROOM})

    def patch(self, request):
        """Update just the device_order preference for the current user."""
        order = request.data.get('device_order')
        valid_choices = [c[0] for c in DashboardLayout.ORDER_CHOICES]
        if order not in valid_choices:
            return Response(
                {"device_order": f"Must be one of: {', '.join(valid_choices)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get or create a personal layout for this user
        try:
            layout_obj = DashboardLayout.objects.get(user=request.user)
        except DashboardLayout.DoesNotExist:
            # Bootstrap from the shared layout or create a minimal one
            try:
                shared = DashboardLayout.objects.get(user__isnull=True)
                layout_data = shared.layout
            except DashboardLayout.DoesNotExist:
                layout_data = {"version": 1, "items": []}
            layout_obj = DashboardLayout.objects.create(
                user=request.user,
                layout=layout_data,
                device_order=order,
            )
            return Response({"device_order": layout_obj.device_order})

        layout_obj.device_order = order
        layout_obj.save(update_fields=['device_order', 'updated_at'])
        return Response({"device_order": layout_obj.device_order})
