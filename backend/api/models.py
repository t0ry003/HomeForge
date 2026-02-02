from django.db import models
from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
import os
import uuid

def avatar_upload_path(instance, filename):
    """Generate a unique path for the avatar using UUID."""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return os.path.join('avatars/', filename)

class Profile(models.Model):
	"""Extended profile for users: avatar image and role for dashboard permissions."""
	ROLE_OWNER = 'owner'
	ROLE_ADMIN = 'admin'
	ROLE_USER = 'user'
	ROLE_VIEWER = 'viewer'

	ROLE_CHOICES = [
		(ROLE_OWNER, 'Owner'),
		(ROLE_ADMIN, 'Admin'),
		(ROLE_USER, 'User'),
		(ROLE_VIEWER, 'Viewer'),
	]

	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
	avatar = models.ImageField(upload_to=avatar_upload_path, null=True, blank=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
	accent_color = models.CharField(max_length=7, default='#3B82F6', blank=True)

	def __str__(self):
		return f"Profile({self.user.username})"

@receiver(pre_save, sender=Profile)
def delete_old_avatar_on_change(sender, instance, **kwargs):
	"""Delete the old avatar file from the filesystem when a new one is uploaded."""
	if not instance.pk:
		return False

	try:
		old_profile = Profile.objects.get(pk=instance.pk)
		old_avatar = old_profile.avatar
	except Profile.DoesNotExist:
		return False

	new_avatar = instance.avatar
	if old_avatar and old_avatar != new_avatar:
		if old_avatar and os.path.isfile(old_avatar.path):
			os.remove(old_avatar.path)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		Profile.objects.create(user=instance)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
	# Ensure profile exists and is saved whenever the user is saved
	try:
		instance.profile.save()
	except Exception:
		# If profile doesn't exist for some reason, create it
		Profile.objects.get_or_create(user=instance)


class Room(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rooms')

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class Device(models.Model):
    STATUS_ONLINE = 'online'
    STATUS_OFFLINE = 'offline'
    STATUS_ERROR = 'error'
    STATUS_CHOICES = [
        (STATUS_ONLINE, 'Online'),
        (STATUS_OFFLINE, 'Offline'),
        (STATUS_ERROR, 'Error'),
    ]

    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(protocol='IPv4')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OFFLINE, db_index=True)
    icon = models.CharField(max_length=50, default='fa-cube', blank=True, help_text="FontAwesome icon class (e.g., fa-lightbulb)")
    device_type = models.ForeignKey('CustomDeviceType', on_delete=models.CASCADE, related_name='devices')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices', db_index=True)
    current_state = models.JSONField(default=dict, blank=True, help_text="Current state of device controls (e.g., {'relay_1': True})")

    class Meta:
        ordering = ['-id']
        indexes = [
            models.Index(fields=['user', 'status'], name='device_user_status_idx'),
            models.Index(fields=['room'], name='device_room_idx'),
            models.Index(fields=['device_type'], name='device_type_idx'),
        ]

    def __str__(self):
        return f"{self.name} - {self.ip_address}"


class CustomDeviceType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    definition = models.JSONField(default=dict, blank=True)
    approved = models.BooleanField(default=False, db_index=True)
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejection if denied Admin approval")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['approved', 'created_at'], name='devicetype_approved_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({'Approved' if self.approved else 'Pending'})"


class DeviceCardTemplate(models.Model):
    """
    Defines the UI layout for a specific device type card.
    One-to-One with CustomDeviceType.
    """
    device_type = models.OneToOneField(CustomDeviceType, on_delete=models.CASCADE, related_name='card_template')
    layout_config = models.JSONField(default=dict, blank=True, help_text="Frontend grid layout configuration (x, y, w, h)")

    def __str__(self):
        return f"Template for {self.device_type.name}"


class DeviceControl(models.Model):
    """
    Individual control widgets (sliders, toggles, sensors) for the device card.
    """
    # Interactive Controls
    WIDGET_TOGGLE = 'TOGGLE'
    WIDGET_SLIDER = 'SLIDER'
    WIDGET_BUTTON = 'BUTTON'
    
    # Display/Sensor Widgets
    WIDGET_GAUGE = 'GAUGE'
    WIDGET_TEMPERATURE = 'TEMPERATURE'
    WIDGET_HUMIDITY = 'HUMIDITY'
    WIDGET_MOTION = 'MOTION'
    WIDGET_LIGHT = 'LIGHT'
    WIDGET_CO2 = 'CO2'
    WIDGET_PRESSURE = 'PRESSURE'
    WIDGET_POWER = 'POWER'
    WIDGET_BATTERY = 'BATTERY'
    WIDGET_STATUS = 'STATUS'
    
    WIDGET_CHOICES = [
        # Interactive
        (WIDGET_TOGGLE, 'Toggle Switch'),
        (WIDGET_SLIDER, 'Slider'),
        (WIDGET_BUTTON, 'Button'),
        # Sensors/Display
        (WIDGET_GAUGE, 'Gauge'),
        (WIDGET_TEMPERATURE, 'Temperature Sensor'),
        (WIDGET_HUMIDITY, 'Humidity Sensor'),
        (WIDGET_MOTION, 'Motion Sensor'),
        (WIDGET_LIGHT, 'Light Sensor'),
        (WIDGET_CO2, 'CO2 Sensor'),
        (WIDGET_PRESSURE, 'Pressure Sensor'),
        (WIDGET_POWER, 'Power Meter'),
        (WIDGET_BATTERY, 'Battery Level'),
        (WIDGET_STATUS, 'Status Indicator'),
    ]
    
    # Display variant options
    VARIANT_ROW = 'row'
    VARIANT_SQUARE = 'square'
    VARIANT_COMPACT = 'compact'
    
    VARIANT_CHOICES = [
        (VARIANT_ROW, 'Row'),
        (VARIANT_SQUARE, 'Square'),
        (VARIANT_COMPACT, 'Compact'),
    ]
    
    # Size options
    SIZE_SM = 'sm'
    SIZE_MD = 'md'
    SIZE_LG = 'lg'
    
    SIZE_CHOICES = [
        (SIZE_SM, 'Small'),
        (SIZE_MD, 'Medium'),
        (SIZE_LG, 'Large'),
    ]

    template = models.ForeignKey(DeviceCardTemplate, on_delete=models.CASCADE, related_name='controls')
    widget_type = models.CharField(max_length=20, choices=WIDGET_CHOICES)
    label = models.CharField(max_length=50)
    variable_mapping = models.CharField(max_length=50, help_text="MQTT/API variable key (e.g., relay_1)")
    
    # Slider/Gauge specific fields
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    step = models.FloatField(null=True, blank=True)
    
    # New optional display fields
    variant = models.CharField(max_length=20, choices=VARIANT_CHOICES, null=True, blank=True, help_text="Display variant: row, square, or compact")
    size = models.CharField(max_length=10, choices=SIZE_CHOICES, null=True, blank=True, help_text="Widget size: sm, md, or lg")
    unit = models.CharField(max_length=20, null=True, blank=True, help_text="Display unit (e.g., °C, %, lux, ppm)")

    class Meta:
        # Ensure a variable name is unique within a single device type template
        unique_together = ('template', 'variable_mapping')

    def __str__(self):
        return f"{self.label} ({self.widget_type})"


class Notification(models.Model):
    """
    Notification model for user alerts and system messages.
    Supports different notification types with flexible metadata.
    """
    # Notification Types
    TYPE_DEVICE_TYPE_PENDING = 'device_type_pending'      # Admin: new type awaiting approval
    TYPE_DEVICE_TYPE_APPROVED = 'device_type_approved'    # User: your type was approved
    TYPE_DEVICE_TYPE_DENIED = 'device_type_denied'        # User: your type was denied
    TYPE_DEVICE_OFFLINE = 'device_offline'                # Device went offline
    TYPE_DEVICE_ONLINE = 'device_online'                  # Device came online
    TYPE_DEVICE_ERROR = 'device_error'                    # Device has an error
    TYPE_SYSTEM = 'system'                                # General system notification
    TYPE_INFO = 'info'                                    # Informational message
    TYPE_WARNING = 'warning'                              # Warning message
    TYPE_ERROR = 'error'                                  # Error message
    
    TYPE_CHOICES = [
        (TYPE_DEVICE_TYPE_PENDING, 'Device Type Pending'),
        (TYPE_DEVICE_TYPE_APPROVED, 'Device Type Approved'),
        (TYPE_DEVICE_TYPE_DENIED, 'Device Type Denied'),
        (TYPE_DEVICE_OFFLINE, 'Device Offline'),
        (TYPE_DEVICE_ONLINE, 'Device Online'),
        (TYPE_DEVICE_ERROR, 'Device Error'),
        (TYPE_SYSTEM, 'System'),
        (TYPE_INFO, 'Info'),
        (TYPE_WARNING, 'Warning'),
        (TYPE_ERROR, 'Error'),
    ]
    
    # Priority levels
    PRIORITY_LOW = 'low'
    PRIORITY_NORMAL = 'normal'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'
    
    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_NORMAL, 'Normal'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    ]

    # Core fields
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        help_text="The user who receives this notification"
    )
    notification_type = models.CharField(
        max_length=30, 
        choices=TYPE_CHOICES, 
        default=TYPE_INFO,
        db_index=True
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_CHOICES, 
        default=PRIORITY_NORMAL
    )
    
    # Status
    is_read = models.BooleanField(default=False, db_index=True)
    
    # Optional reference to related objects (stored as JSON for flexibility)
    # e.g., {"device_type_id": 5} or {"device_id": 12}
    reference_data = models.JSONField(default=dict, blank=True)
    
    # Link for action (optional)
    action_url = models.CharField(max_length=500, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read'], name='notif_user_read_idx'),
            models.Index(fields=['user', 'notification_type'], name='notif_user_type_idx'),
            models.Index(fields=['created_at'], name='notif_created_idx'),
        ]
    
    def __str__(self):
        status = "Read" if self.is_read else "Unread"
        return f"[{status}] {self.title} - {self.user.username}"
    
    def mark_as_read(self):
        """Mark this notification as read."""
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @classmethod
    def create_notification(cls, user, notification_type, title, message, 
                           priority=None, reference_data=None, action_url=None):
        """
        Helper method to create a notification.
        """
        return cls.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority or cls.PRIORITY_NORMAL,
            reference_data=reference_data or {},
            action_url=action_url
        )
    
    @classmethod
    def notify_admins(cls, notification_type, title, message, 
                      priority=None, reference_data=None, action_url=None):
        """
        Send a notification to all admin and owner users.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        admin_profiles = Profile.objects.filter(role__in=[Profile.ROLE_ADMIN, Profile.ROLE_OWNER])
        admin_users = User.objects.filter(profile__in=admin_profiles)
        
        notifications = []
        for user in admin_users:
            notifications.append(cls(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority or cls.PRIORITY_NORMAL,
                reference_data=reference_data or {},
                action_url=action_url
            ))
        
        return cls.objects.bulk_create(notifications)
