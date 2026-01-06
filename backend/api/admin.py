from django.contrib import admin

from django.contrib import admin
from .models import Profile, Room, DeviceType, Device


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
	list_display = ('user', 'role')
	readonly_fields = ()


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
	list_display = ('name', 'user')
	list_filter = ('user',)
	search_fields = ('name',)


@admin.register(DeviceType)
class DeviceTypeAdmin(admin.ModelAdmin):
	list_display = ('name', 'user', 'description')
	list_filter = ('user',)
	search_fields = ('name', 'description')


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
	list_display = ('name', 'device_type', 'ip_address', 'status', 'room', 'user')
	list_filter = ('status', 'device_type', 'room', 'user')
	search_fields = ('name', 'ip_address')

