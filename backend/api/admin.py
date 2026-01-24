from django.contrib import admin

from django.contrib import admin
from .models import Profile, Device, Room, CustomDeviceType, DeviceCardTemplate, DeviceControl

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ('name', 'ip_address', 'device_type', 'status', 'user')

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'user')

class DeviceControlInline(admin.TabularInline):
    model = DeviceControl
    extra = 1

@admin.register(DeviceCardTemplate)
class DeviceCardTemplateAdmin(admin.ModelAdmin):
    list_display = ('device_type',)
    inlines = [DeviceControlInline]

@admin.register(CustomDeviceType)
class CustomDeviceTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'approved')
    list_filter = ('approved',)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
	list_display = ('user', 'role')
	readonly_fields = ()

