from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Profile, Device, Room, CustomDeviceType


class CustomDeviceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomDeviceType
        fields = ['id', 'name', 'definition', 'approved', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'name': {
                'error_messages': {
                    'unique': 'A device type with this name already exists.'
                }
            }
        }



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
        fields = ['id', 'name', 'ip_address', 'status', 'device_type', 'device_type_name', 'room', 'room_name', 'room_id']

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