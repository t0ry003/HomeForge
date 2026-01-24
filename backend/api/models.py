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
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OFFLINE)
    icon = models.CharField(max_length=50, default='fa-cube', blank=True, help_text="FontAwesome icon class (e.g., fa-lightbulb)")
    device_type = models.ForeignKey('CustomDeviceType', on_delete=models.CASCADE, related_name='devices')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices')
    current_state = models.JSONField(default=dict, blank=True, help_text="Current state of device controls (e.g., {'relay_1': True})")

    def __str__(self):
        return f"{self.name} - {self.ip_address}"


class CustomDeviceType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    definition = models.JSONField(default=dict, blank=True)
    approved = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejection if denied Admin approval")
    created_at = models.DateTimeField(auto_now_add=True)

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
    Individual control widgets (sliders, toggles) for the device card.
    """
    WIDGET_TOGGLE = 'TOGGLE'
    WIDGET_SLIDER = 'SLIDER'
    WIDGET_GAUGE = 'GAUGE'
    
    WIDGET_CHOICES = [
        (WIDGET_TOGGLE, 'Toggle Switch'),
        (WIDGET_SLIDER, 'Slider'),
        (WIDGET_GAUGE, 'Gauge'),
    ]

    template = models.ForeignKey(DeviceCardTemplate, on_delete=models.CASCADE, related_name='controls')
    widget_type = models.CharField(max_length=20, choices=WIDGET_CHOICES)
    label = models.CharField(max_length=50)
    variable_mapping = models.CharField(max_length=50, help_text="MQTT/API variable key (e.g., relay_1)")
    
    # Slider/Gauge specific fields
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    step = models.FloatField(null=True, blank=True)

    class Meta:
        # Ensure a variable name is unique within a single device type template
        unique_together = ('template', 'variable_mapping')

    def __str__(self):
        return f"{self.label} ({self.widget_type})"
