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


class DeviceType(models.Model):
    """Device type definition with schema for sensors and actions."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    schema = models.JSONField(default=dict, help_text="JSON schema defining sensors and actions, e.g., {'sensors': ['temperature'], 'actions': ['set_temp']}")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_types')

    class Meta:
        unique_together = ['name', 'user']

    def __str__(self):
        return f"{self.name}"


class Device(models.Model):
    STATUS_ONLINE = 'online'
    STATUS_OFFLINE = 'offline'
    STATUS_CHOICES = [
        (STATUS_ONLINE, 'Online'),
        (STATUS_OFFLINE, 'Offline'),
    ]

    name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(protocol='IPv4')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_OFFLINE)
    device_type = models.ForeignKey(DeviceType, on_delete=models.PROTECT, related_name='devices')
    custom_data = models.JSONField(default=dict, blank=True, help_text="Current values for sensors defined in device type schema, e.g., {'temperature': 72}")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices')

    def __str__(self):
        return f"{self.name} - {self.ip_address}"