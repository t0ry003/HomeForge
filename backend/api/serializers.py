from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Device, Room, CustomDeviceType, DeviceCardTemplate, DeviceControl, Notification, DashboardLayout


class DeviceControlSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceControl
        fields = ['id', 'widget_type', 'label', 'variable_mapping', 'min_value', 'max_value', 'step', 'variant', 'size', 'unit']
        extra_kwargs = {
            'min_value': {'required': False},
            'max_value': {'required': False},
            'step': {'required': False},
            'variant': {'required': False},
            'size': {'required': False},
            'unit': {'required': False},
        }

    def validate(self, data):
        """
        Validate that SLIDER widgets have min/max/step values.
        Sensor widgets do not require these fields.
        """
        widget_type = data.get('widget_type')
        
        # SLIDER requires min/max/step
        if widget_type == 'SLIDER':
            if data.get('min_value') is None:
                raise serializers.ValidationError({'min_value': 'This field is required for SLIDER widgets.'})
            if data.get('max_value') is None:
                raise serializers.ValidationError({'max_value': 'This field is required for SLIDER widgets.'})
            if data.get('step') is None:
                raise serializers.ValidationError({'step': 'This field is required for SLIDER widgets.'})
        
        return data


class DeviceCardTemplateSerializer(serializers.ModelSerializer):
    controls = DeviceControlSerializer(many=True)

    class Meta:
        model = DeviceCardTemplate
        fields = ['id', 'layout_config', 'controls']


class CustomDeviceTypeSerializer(serializers.ModelSerializer):
    card_template = DeviceCardTemplateSerializer(required=False)
    proposed_by_username = serializers.CharField(source='proposed_by.username', read_only=True)
    wiring_diagram_base64 = serializers.CharField(required=False, allow_blank=True)
    # Keep wiring_diagram_image as an alias that returns the same base64 value (backward compat for frontend)
    wiring_diagram_image = serializers.CharField(source='wiring_diagram_base64', read_only=True)

    class Meta:
        model = CustomDeviceType
        fields = ['id', 'name', 'definition', 'approved', 'rejection_reason', 'proposed_by', 'proposed_by_username', 'created_at', 'card_template', 'firmware_code', 'wiring_diagram_image', 'wiring_diagram_base64', 'wiring_diagram_text', 'documentation', 'documentation_images_base64']
        read_only_fields = ['id', 'created_at', 'approved', 'rejection_reason', 'proposed_by', 'proposed_by_username', 'wiring_diagram_image']
        extra_kwargs = {
            'name': {
                'error_messages': {
                    'unique': 'A device type with this name already exists.'
                }
            },
            'firmware_code': {'required': False},
            'wiring_diagram_text': {'required': False},
            'documentation': {'required': False},
            'documentation_images_base64': {'required': False},
        }

    def validate_firmware_code(self, value):
        if value and len(value) > 100000:
            raise serializers.ValidationError("Firmware code must not exceed 100,000 characters.")
        if value:
            required_vars = ['wifi_ssid', 'wifi_password', 'server_ip']
            missing = [v for v in required_vars if v not in value]
            if missing:
                raise serializers.ValidationError(
                    "Firmware code must contain the variables: wifi_ssid, wifi_password, server_ip. These are required for device connectivity."
                )
        return value

    def validate_documentation(self, value):
        if value and len(value) > 50000:
            raise serializers.ValidationError("Documentation must not exceed 50,000 characters.")
        return value

    def validate_wiring_diagram_text(self, value):
        if value and len(value) > 50000:
            raise serializers.ValidationError("Wiring diagram text must not exceed 50,000 characters.")
        return value

    def validate(self, data):
        definition = data.get('definition', {})
        card_template_data = data.get('card_template')

        if card_template_data:
            # Extract distinct IDs defined in the node builder structure
            structure = definition.get('structure', [])
            defined_ids = {node.get('id') for node in structure if 'id' in node}

            # Check controls against defined IDs
            controls_data = card_template_data.get('controls', [])
            for control in controls_data:
                mapping = control.get('variable_mapping')
                if mapping and mapping not in defined_ids:
                    raise serializers.ValidationError(
                        f"Variable mapping '{mapping}' in controls does not match any ID in the device definition."
                    )
        
        return data

    def create(self, validated_data):
        card_template_data = validated_data.pop('card_template', None)
        
        # Set proposed_by from request context
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['proposed_by'] = request.user
        
        # Create the Device Type
        device_type = CustomDeviceType.objects.create(**validated_data)
        
        # Create Template and Controls if provided
        if card_template_data:
            controls_data = card_template_data.pop('controls', [])
            template = DeviceCardTemplate.objects.create(device_type=device_type, **card_template_data)
            
            for control_data in controls_data:
                DeviceControl.objects.create(template=template, **control_data)
        
        return device_type

    def update(self, instance, validated_data):
        card_template_data = validated_data.pop('card_template', None)
        
        # Update definition and name
        instance.name = validated_data.get('name', instance.name)
        instance.definition = validated_data.get('definition', instance.definition)
        instance.firmware_code = validated_data.get('firmware_code', instance.firmware_code)
        instance.wiring_diagram_text = validated_data.get('wiring_diagram_text', instance.wiring_diagram_text)
        instance.documentation = validated_data.get('documentation', instance.documentation)
        
        # Handle wiring diagram base64
        if 'wiring_diagram_base64' in validated_data:
            instance.wiring_diagram_base64 = validated_data['wiring_diagram_base64']
        
        # Handle documentation images base64
        if 'documentation_images_base64' in validated_data:
            instance.documentation_images_base64 = validated_data['documentation_images_base64']
        
        instance.save()
        
        if card_template_data:
            controls_data = card_template_data.pop('controls', [])
            
            # Update or Create Template
            template, created = DeviceCardTemplate.objects.get_or_create(
                device_type=instance,
                defaults=card_template_data
            )
            
            if not created:
                template.layout_config = card_template_data.get('layout_config', template.layout_config)
                template.save()

            # For simplicity, clear old controls and re-create (full sync)
            template.controls.all().delete()
            for control_data in controls_data:
                DeviceControl.objects.create(template=template, **control_data)

        return instance



class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'icon']

    def validate_name(self, value):
        """Ensure no duplicate room names for the same user."""
        request = self.context.get('request')
        if request and request.user:
            qs = Room.objects.filter(name__iexact=value, user=request.user)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("A room with this name already exists.")
        return value


class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(read_only=True, source='room')
    device_type_name = serializers.CharField(source='device_type.name', read_only=True)

    class Meta:
        model = Device
        fields = ['id', 'name', 'ip_address', 'status', 'icon', 'device_type', 'device_type_name', 'room', 'room_name', 'room_id', 'current_state']

    def validate_ip_address(self, value):
        """
        Check that the IP address is unique across all devices.
        """
        qs = Device.objects.filter(ip_address=value)
        # Exclude current device if updating
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError(f"A device with IP address {value} already exists.")
        return value

    def validate_device_type(self, value):
        if not value.approved:
             raise serializers.ValidationError("Device type must be approved.")
        return value



class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ('avatar', 'role', 'accent_color')

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=Profile.ROLE_CHOICES, default=Profile.ROLE_USER, required=False)
    
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all(), message="This email is already registered.")]
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']
        extra_kwargs = {
            'username': {
                'error_messages': {
                    'unique': 'This username is already taken.'
                }
            }
        }

    def create(self, validated_data):
        # Check if this is the first user
        is_first_user = not User.objects.exists()

        # Use create_user to hash the password automatically
        role = validated_data.pop('role', Profile.ROLE_USER)
        
        # If first user, force role to OWNER and give staff/superuser status
        if is_first_user:
            role = Profile.ROLE_OWNER
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        if is_first_user:
            user.is_staff = True
            user.is_superuser = True
            user.save()

        # Ensure profile exists and set role
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.role = role
        profile.save()
        return user


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    
    # Human-readable type and priority
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    # Time since creation (for display)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'priority',
            'priority_display',
            'is_read',
            'reference_data',
            'action_url',
            'created_at',
            'read_at',
            'time_ago',
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'time_ago']
    
    def get_time_ago(self, obj):
        """Calculate human-readable time since notification was created."""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}m ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours}h ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days}d ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications (admin use)."""
    
    # Allow specifying user by ID or username
    user_id = serializers.IntegerField(write_only=True, required=False)
    username = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Notification
        fields = [
            'user_id',
            'username',
            'notification_type',
            'title',
            'message',
            'priority',
            'reference_data',
            'action_url',
        ]
    
    def validate(self, data):
        user_id = data.pop('user_id', None)
        username = data.pop('username', None)
        
        if not user_id and not username:
            raise serializers.ValidationError("Either 'user_id' or 'username' must be provided.")
        
        try:
            if user_id:
                data['user'] = User.objects.get(pk=user_id)
            else:
                data['user'] = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        
        return data


class DashboardLayoutSerializer(serializers.Serializer):
    """
    Serializer for dashboard layout validation.
    Validates the layout JSON structure: version, items (devices + folders).
    Also accepts an optional device_order preference.
    """
    layout = serializers.JSONField()
    device_order = serializers.ChoiceField(
        choices=DashboardLayout.ORDER_CHOICES,
        required=False,
        default=None,
        help_text="Device grouping/sorting preference.",
    )

    def _validate_layout_structure(self, layout):
        """Validate the top-level layout structure."""
        if not isinstance(layout, dict):
            raise serializers.ValidationError({"layout": "Layout must be a JSON object."})

        # version must be 1
        version = layout.get('version')
        if version != 1:
            raise serializers.ValidationError({"layout": "layout.version must equal 1."})

        # items must be a non-empty array with <= 100 entries
        items = layout.get('items')
        if not isinstance(items, list) or len(items) == 0:
            raise serializers.ValidationError({"layout": "layout.items must be a non-empty array."})
        if len(items) > 100:
            raise serializers.ValidationError({"layout": "layout.items must have at most 100 entries."})

        return items

    def _collect_device_ids_and_validate_items(self, items):
        """Validate each item and collect all device IDs."""
        all_device_ids = []
        folder_ids = set()

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    {"layout": f"items[{i}] must be a JSON object."}
                )

            item_type = item.get('type')
            if item_type not in ('device', 'folder'):
                raise serializers.ValidationError(
                    {"layout": f"items[{i}].type must be 'device' or 'folder'."}
                )

            if item_type == 'device':
                device_id = item.get('deviceId')
                if not isinstance(device_id, int):
                    raise serializers.ValidationError(
                        {"layout": f"items[{i}].deviceId must be an integer."}
                    )
                all_device_ids.append(device_id)

            elif item_type == 'folder':
                # Validate folderId
                folder_id = item.get('folderId')
                if not isinstance(folder_id, str) or not folder_id.strip():
                    raise serializers.ValidationError(
                        {"layout": f"items[{i}].folderId must be a non-empty string."}
                    )
                if folder_id in folder_ids:
                    raise serializers.ValidationError(
                        {"layout": f"Duplicate folderId '{folder_id}'."}
                    )
                folder_ids.add(folder_id)

                # Validate name
                name = item.get('name')
                if not isinstance(name, str) or not name.strip():
                    raise serializers.ValidationError(
                        {"layout": f"items[{i}].name must be a non-empty string."}
                    )
                if len(name) > 50:
                    raise serializers.ValidationError(
                        {"layout": f"items[{i}].name must be at most 50 characters."}
                    )

                # Validate deviceIds
                device_ids = item.get('deviceIds')
                if not isinstance(device_ids, list) or not (2 <= len(device_ids) <= 4):
                    raise serializers.ValidationError(
                        {"layout": f"items[{i}].deviceIds must be an array of 2-4 integers."}
                    )
                for j, did in enumerate(device_ids):
                    if not isinstance(did, int):
                        raise serializers.ValidationError(
                            {"layout": f"items[{i}].deviceIds[{j}] must be an integer."}
                        )
                all_device_ids.extend(device_ids)

        return all_device_ids

    def _check_duplicate_device_ids(self, all_device_ids):
        """Ensure no device ID appears more than once."""
        seen = set()
        for did in all_device_ids:
            if did in seen:
                raise serializers.ValidationError(
                    {"layout": f"Duplicate deviceId {did}. Each device may appear at most once."}
                )
            seen.add(did)

    def _check_devices_exist(self, all_device_ids, user, skip_ownership=False):
        """Ensure all referenced device IDs exist and are accessible to the user."""
        if not all_device_ids:
            return
        qs = Device.objects.filter(id__in=all_device_ids)
        if not skip_ownership:
            qs = qs.filter(user=user)
        existing_ids = set(qs.values_list('id', flat=True))
        missing = set(all_device_ids) - existing_ids
        if missing:
            raise serializers.ValidationError(
                {"layout": f"Device IDs not found or not accessible: {sorted(missing)}"}
            )

    def validate_layout(self, value):
        """Full layout validation pipeline."""
        items = self._validate_layout_structure(value)
        all_device_ids = self._collect_device_ids_and_validate_items(items)
        self._check_duplicate_device_ids(all_device_ids)

        # Device existence check requires user from context
        user = self.context.get('user')
        skip_ownership = self.context.get('skip_ownership', False)
        if user:
            self._check_devices_exist(all_device_ids, user, skip_ownership=skip_ownership)

        return value