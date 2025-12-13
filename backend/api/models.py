from django.db import models
from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import post_save


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
	avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)

	def __str__(self):
		return f"Profile({self.user.username})"


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