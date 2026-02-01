# HomeForge Backend - GitHub Copilot Instructions

## Technology Stack

- **Framework**: Django 4.x
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL
- **Authentication**: Token-based (DRF TokenAuthentication)
- **Python Version**: 3.11+

---

## Project Structure

```
backend/
├── api/                      # Main API application
│   ├── models.py             # Database models
│   ├── serializers.py        # DRF serializers
│   ├── views.py              # API viewsets and views
│   ├── views_rooms.py        # Room-specific views
│   ├── urls.py               # URL routing
│   ├── permissions.py        # Custom permissions
│   ├── validators.py         # Custom validators
│   ├── admin.py              # Admin configuration
│   ├── tests.py              # Unit tests
│   ├── migrations/           # Database migrations
│   └── management/           # Custom management commands
│       └── commands/
├── my_backend/               # Django project settings
│   ├── settings.py           # Project settings
│   ├── urls.py               # Root URL configuration
│   ├── wsgi.py               # WSGI config
│   └── asgi.py               # ASGI config
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── Dockerfile                # Docker configuration
└── migrate.sh                # Migration helper script
```

---

## Django Best Practices

### Model Design

1. **Use meaningful model names** - Singular, PascalCase
2. **Add `__str__` method** - For admin and debugging
3. **Use choices for fixed values** - Define as class attributes
4. **Add related_name** - For reverse relations
5. **Include Meta class** - For ordering, verbose names

```python
# ✅ Good - Well-structured model
from django.db import models
from django.contrib.auth.models import User


class Device(models.Model):
    """Smart home device model."""
    
    class Status(models.TextChoices):
        ONLINE = 'online', 'Online'
        OFFLINE = 'offline', 'Offline'
        ERROR = 'error', 'Error'
    
    class DeviceType(models.TextChoices):
        LIGHT = 'light', 'Light'
        THERMOSTAT = 'thermostat', 'Thermostat'
        SENSOR = 'sensor', 'Sensor'
        SWITCH = 'switch', 'Switch'
    
    name = models.CharField(max_length=100)
    device_type = models.CharField(
        max_length=50,
        choices=DeviceType.choices,
        default=DeviceType.LIGHT
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OFFLINE
    )
    room = models.ForeignKey(
        'Room',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='devices'
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    current_state = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'
    
    def __str__(self) -> str:
        return f"{self.name} ({self.device_type})"
```

### Model Field Guidelines

| Field Type | Use Case |
|------------|----------|
| `CharField` | Short text with max length |
| `TextField` | Long text, descriptions |
| `JSONField` | Flexible structured data |
| `ForeignKey` | Many-to-one relations |
| `ManyToManyField` | Many-to-many relations |
| `DateTimeField` | Timestamps |
| `BooleanField` | True/False flags |
| `DecimalField` | Precise numbers (money) |
| `PositiveIntegerField` | Non-negative integers |

---

## Django REST Framework Best Practices

### Serializers

1. **Use ModelSerializer** for standard CRUD
2. **Define explicit fields** - Never use `fields = '__all__'`
3. **Add validation** in `validate_<field>` or `validate` methods
4. **Use nested serializers** for related objects
5. **Add `read_only_fields`** for computed fields

```python
# ✅ Good - Well-structured serializer
from rest_framework import serializers
from .models import Device, Room


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model."""
    
    room_name = serializers.CharField(source='room.name', read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    
    class Meta:
        model = Device
        fields = [
            'id',
            'name',
            'device_type',
            'status',
            'room',
            'room_name',
            'owner',
            'owner_username',
            'current_state',
            'description',
            'icon',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def validate_name(self, value: str) -> str:
        """Validate device name is not empty and properly formatted."""
        if not value.strip():
            raise serializers.ValidationError("Device name cannot be empty.")
        return value.strip()
    
    def validate_current_state(self, value: dict) -> dict:
        """Validate current_state JSON structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Current state must be a dictionary.")
        return value
    
    def create(self, validated_data: dict) -> Device:
        """Set owner from request context."""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class DeviceDetailSerializer(DeviceSerializer):
    """Extended serializer with nested room data."""
    
    room = RoomSerializer(read_only=True)
```

### ViewSets and Views

1. **Use ViewSets** for standard CRUD operations
2. **Override `get_queryset`** for user-specific filtering
3. **Use action decorators** for custom endpoints
4. **Apply proper permissions**

```python
# ✅ Good - Well-structured ViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import QuerySet

from .models import Device
from .serializers import DeviceSerializer, DeviceDetailSerializer
from .permissions import IsOwnerOrReadOnly


class DeviceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing smart home devices.
    
    Endpoints:
    - GET /devices/ - List user's devices
    - POST /devices/ - Create new device
    - GET /devices/{id}/ - Get device details
    - PUT /devices/{id}/ - Update device
    - DELETE /devices/{id}/ - Delete device
    - POST /devices/{id}/toggle/ - Toggle device status
    """
    
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return DeviceDetailSerializer
        return DeviceSerializer
    
    def get_queryset(self) -> QuerySet[Device]:
        """Return devices owned by the current user."""
        return Device.objects.filter(
            owner=self.request.user
        ).select_related('room', 'owner')
    
    def perform_create(self, serializer: DeviceSerializer) -> None:
        """Set owner when creating device."""
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None) -> Response:
        """Toggle device between online and offline status."""
        device = self.get_object()
        device.status = 'offline' if device.status == 'online' else 'online'
        device.save(update_fields=['status', 'updated_at'])
        
        serializer = self.get_serializer(device)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_state(self, request, pk=None) -> Response:
        """Update device current state."""
        device = self.get_object()
        new_state = request.data.get('state', {})
        
        if not isinstance(new_state, dict):
            return Response(
                {'error': 'State must be a dictionary'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        device.current_state.update(new_state)
        device.save(update_fields=['current_state', 'updated_at'])
        
        serializer = self.get_serializer(device)
        return Response(serializer.data)
```

### Custom Permissions

```python
# permissions.py
from rest_framework import permissions
from typing import Any


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners to edit their objects.
    """
    
    def has_object_permission(self, request, view, obj: Any) -> bool:
        # Read permissions are allowed for safe methods
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        return obj.owner == request.user


class IsAdminOrOwner(permissions.BasePermission):
    """
    Allow access to admin users or object owners.
    """
    
    def has_object_permission(self, request, view, obj: Any) -> bool:
        return request.user.is_staff or obj.owner == request.user
```

---

## URL Routing

### Router Configuration

```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'devices', views.DeviceViewSet, basename='device')
router.register(r'rooms', views.RoomViewSet, basename='room')

urlpatterns = [
    path('', include(router.urls)),
    # Custom endpoints outside router
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('device-types/', views.DeviceTypeListView.as_view(), name='device-types'),
]
```

---

## Database Migrations

### Migration Guidelines

1. **Create migrations for every model change**
2. **Review migrations before applying**
3. **Never edit existing migrations in production**
4. **Use `RunPython` for data migrations**

```bash
# Create migrations
python manage.py makemigrations

# Review migration
python manage.py sqlmigrate api 0001

# Apply migrations
python manage.py migrate
```

### Data Migrations

```python
# migrations/0002_populate_device_types.py
from django.db import migrations


def create_device_types(apps, schema_editor):
    DeviceType = apps.get_model('api', 'DeviceType')
    device_types = [
        {'name': 'light', 'icon': 'lightbulb'},
        {'name': 'thermostat', 'icon': 'thermometer'},
        {'name': 'sensor', 'icon': 'activity'},
    ]
    for dt in device_types:
        DeviceType.objects.create(**dt)


def reverse_device_types(apps, schema_editor):
    DeviceType = apps.get_model('api', 'DeviceType')
    DeviceType.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(create_device_types, reverse_device_types),
    ]
```

---

## Query Optimization

### Efficient Queries

1. **Use `select_related`** for ForeignKey
2. **Use `prefetch_related`** for ManyToMany
3. **Use `only()` and `defer()`** to limit fields
4. **Avoid N+1 queries**

```python
# ❌ Bad - N+1 query problem
devices = Device.objects.all()
for device in devices:
    print(device.room.name)  # Each iteration hits database

# ✅ Good - Single query with join
devices = Device.objects.select_related('room', 'owner').all()
for device in devices:
    print(device.room.name)  # No additional queries

# ✅ Good - Prefetch for reverse relations
rooms = Room.objects.prefetch_related('devices').all()
for room in rooms:
    for device in room.devices.all():  # No additional queries
        print(device.name)
```

---

## Error Handling

### API Error Responses

```python
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Custom exception handler with consistent error format."""
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data = {
            'error': True,
            'message': str(exc),
            'details': response.data,
            'status_code': response.status_code,
        }
    
    return response


# In views
from rest_framework.exceptions import ValidationError, NotFound

class DeviceViewSet(viewsets.ModelViewSet):
    
    def retrieve(self, request, pk=None):
        try:
            device = self.get_object()
        except Device.DoesNotExist:
            raise NotFound(detail="Device not found")
        
        serializer = self.get_serializer(device)
        return Response(serializer.data)
```

---

## Authentication

### Token Authentication Setup

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# views.py - Login endpoint
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
            })
        
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
```

---

## Testing

### Unit Tests

```python
# tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Device, Room


class DeviceModelTest(TestCase):
    """Tests for Device model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.device = Device.objects.create(
            name='Test Light',
            device_type='light',
            owner=self.user
        )
    
    def test_device_str(self):
        """Test device string representation."""
        self.assertEqual(str(self.device), 'Test Light (light)')
    
    def test_device_default_status(self):
        """Test device has offline status by default."""
        self.assertEqual(self.device.status, 'offline')


class DeviceAPITest(APITestCase):
    """Tests for Device API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.device = Device.objects.create(
            name='Test Device',
            device_type='light',
            owner=self.user
        )
    
    def test_list_devices(self):
        """Test listing user's devices."""
        response = self.client.get('/api/devices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_create_device(self):
        """Test creating a new device."""
        data = {
            'name': 'New Device',
            'device_type': 'thermostat',
        }
        response = self.client.post('/api/devices/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Device.objects.count(), 2)
    
    def test_toggle_device(self):
        """Test toggling device status."""
        response = self.client.post(f'/api/devices/{self.device.id}/toggle/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.device.refresh_from_db()
        self.assertEqual(self.device.status, 'online')
    
    def test_unauthorized_access(self):
        """Test unauthenticated access is denied."""
        self.client.logout()
        response = self.client.get('/api/devices/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test api

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

---

## Admin Configuration

```python
# admin.py
from django.contrib import admin
from .models import Device, Room, Profile


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'device_type', 'status', 'room', 'owner', 'created_at']
    list_filter = ['device_type', 'status', 'created_at']
    search_fields = ['name', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'device_type', 'status')
        }),
        ('Relationships', {
            'fields': ('room', 'owner')
        }),
        ('State', {
            'fields': ('current_state', 'icon', 'description'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'device_count']
    search_fields = ['name']
    
    def device_count(self, obj):
        return obj.devices.count()
    device_count.short_description = 'Devices'
```

---

## Type Hints

Use type hints for better code documentation:

```python
from typing import Optional, List, Dict, Any
from django.db.models import QuerySet


def get_user_devices(user_id: int, status: Optional[str] = None) -> QuerySet[Device]:
    """
    Get devices for a specific user.
    
    Args:
        user_id: The ID of the user
        status: Optional status filter
        
    Returns:
        QuerySet of Device objects
    """
    queryset = Device.objects.filter(owner_id=user_id)
    if status:
        queryset = queryset.filter(status=status)
    return queryset


def format_device_response(device: Device) -> Dict[str, Any]:
    """Format device for API response."""
    return {
        'id': device.id,
        'name': device.name,
        'type': device.device_type,
        'status': device.status,
    }
```

---

## Environment Variables

Use environment variables for configuration:

```python
# settings.py
import os
from pathlib import Path

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'homeforge'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ORIGINS',
    'http://localhost:3000'
).split(',')
```

---

## Don'ts

1. ❌ Don't use `fields = '__all__'` in serializers
2. ❌ Don't forget to add `related_name` on ForeignKeys
3. ❌ Don't skip migrations - always create them for model changes
4. ❌ Don't hardcode secrets - use environment variables
5. ❌ Don't use raw SQL unless absolutely necessary
6. ❌ Don't ignore query optimization - watch for N+1 queries
7. ❌ Don't leave `print()` statements - use proper logging
8. ❌ Don't skip authentication/permissions on sensitive endpoints
9. ❌ Don't return sensitive data (passwords, tokens) in responses
10. ❌ Don't catch broad exceptions without proper handling

---

## API Documentation Maintenance

> **CRITICAL:** The file `API_GUIDE.md` in the project root is the authoritative API reference for frontend developers and agents. **You MUST update it whenever you modify the API.**

### When to Update API_GUIDE.md

Update the documentation whenever you:

1. **Add a new endpoint** - Document method, URL, auth requirements, request/response schemas, and examples
2. **Modify an existing endpoint** - Update request parameters, response fields, or behavior
3. **Change authentication or permissions** - Update the Role-Based Access Control section
4. **Add or modify models** - Update the Data Models section (TypeScript interfaces)
5. **Change validation rules** - Document new constraints in the relevant endpoint section
6. **Add new error responses** - Include in the Error Handling section
7. **Deprecate functionality** - Mark deprecated endpoints and provide migration guidance

### Documentation Update Checklist

When making backend changes, ensure you update:

- [ ] Relevant endpoint documentation (request/response examples)
- [ ] Quick Reference table at the bottom of API_GUIDE.md
- [ ] Data Models section (TypeScript interfaces)
- [ ] Permission Matrix if roles/access changed
- [ ] Integration Examples if API usage patterns changed
- [ ] Version number and "Last Updated" date in the header

### Example: Adding a New Endpoint

If you add a new endpoint like `POST /api/devices/{id}/reboot/`, you must:

```markdown
### 5.X Reboot Device

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/devices/{id}/reboot/` | ✅ Yes |

**Success Response (200 OK):**
```json
{
  "status": "Rebooting",
  "device_id": 5
}
```
```

And add it to the Quick Reference table:

```markdown
| `POST` | `/devices/{id}/reboot/` | Reboot device | ✅ | Owner |
```

---

## Recommended MCP Servers

> **Note:** As of February 2026, dedicated MCP servers for Django, DRF, and PostgreSQL are not yet available as published packages. This section is a placeholder for future integrations.

When MCP servers for Python/Django development become available, they can be configured in `.vscode/mcp.json`. Check the [MCP Server Registry](https://github.com/modelcontextprotocol/servers) for available servers.

### Potential Future Servers

Once available, these types of MCP servers would enhance development:

- **Django/DRF Server** - ORM queries, serializer patterns, viewset helpers
- **PostgreSQL Server** - Query optimization, schema suggestions
- **Python Server** - Type hints, stdlib patterns
- **pytest Server** - Test fixtures, coverage patterns
