from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Device, Room, CustomDeviceType, DeviceCardTemplate, DeviceControl, Notification


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

    class Meta:
        model = CustomDeviceType
        fields = ['id', 'name', 'definition', 'approved', 'rejection_reason', 'proposed_by', 'proposed_by_username', 'created_at', 'card_template']
        read_only_fields = ['id', 'created_at', 'approved', 'rejection_reason', 'proposed_by', 'proposed_by_username']
        extra_kwargs = {
            'name': {
                'error_messages': {
                    'unique': 'A device type with this name already exists.'
                }
            }
        }

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
        fields = ['id', 'name']


class DeviceSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(read_only=True, source='room')
    device_type_name = serializers.CharField(source='device_type.name', read_only=True)

    class Meta:
        model = Device
        fields = ['id', 'name', 'ip_address', 'status', 'icon', 'device_type', 'device_type_name', 'room', 'room_name', 'room_id', 'current_state']

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