from rest_framework import generics, permissions, views
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from .serializers import (
    RegisterSerializer, UserSerializer, DeviceSerializer, RoomSerializer, 
    CustomDeviceTypeSerializer, NotificationSerializer, NotificationCreateSerializer
)
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from rest_framework.response import Response
from .models import Device, Room, CustomDeviceType, Notification
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

            nodes.append({
                "id": node_id,
                "type": "device",
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
        serializer.save(user=self.request.user)

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
