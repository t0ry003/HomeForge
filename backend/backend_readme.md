<p align="center">
  <img src="../logos/favicon/favicon.svg" width="140" alt="HomeForge Logo">
</p>

# HomeForge Backend

> **Smart Home Management Platform - Backend Service**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-green.svg)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

HomeForge is an open-source smart home management system designed for DIY IoT enthusiasts. This backend provides a RESTful API for device management, user authentication, and real-time network topology visualization.

---

## Table of Contents

- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Data Models](#data-models)
- [Authentication System](#authentication-system)
- [Device Control System](#device-control-system)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)

---

## Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.12+ | Runtime environment |
| **Django** | 5.x | Web framework |
| **Django REST Framework** | Latest | RESTful API toolkit |
| **PostgreSQL** | 15 | Primary database |

### Authentication & Security

| Package | Purpose |
|---------|---------|
| `djangorestframework-simplejwt` | JWT token authentication |
| Custom validators | Password policy enforcement |
| Role-based permissions | Hierarchical access control |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| `django-cors-headers` | Cross-Origin Resource Sharing |
| `django-channels` | WebSocket support (future) |
| `Pillow` | Image processing for avatars |
| `psycopg2-binary` | PostgreSQL adapter |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                    React Flow / Dashboard UI                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST + JWT
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DJANGO REST FRAMEWORK                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Views     │  │ Serializers │  │     Permissions         │  │
│  │  (API)      │  │  (JSON)     │  │  (RBAC: Owner/Admin)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ ORM
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │  Users   │  │  Rooms   │  │ Devices  │  │ DeviceTypes    │   │
│  │ Profiles │  │          │  │  States  │  │ CardTemplates  │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MQTT & HTTP
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IOT HARDWARE LAYER                          │
│         ESP32 / ESP8266 / Raspberry Pi / DIY Devices            │
│  (Supports Auto-Discovery via mDNS & Dynamic Key Mapping)       │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client** sends HTTP request with JWT token
2. **JWT Authentication** validates token and extracts user
3. **Permission Classes** check role-based access (Owner, Admin, User, Viewer)
4. **Serializers** validate input and format output
5. **Views** execute business logic
6. **Models** interact with PostgreSQL via Django ORM
7. **Response** returned as JSON

---

## Project Structure

```
/app
├── api/                          # Main Django application
│   ├── management/
│   │   └── commands/
│   │       └── monitor_devices.py   # Device health check command
│   ├── migrations/               # Database schema migrations
│   ├── models.py                 # Data models
│   ├── serializers.py            # DRF serializers
│   ├── views.py                  # API endpoints
│   ├── views_rooms.py            # Room ViewSet
│   ├── urls.py                   # URL routing
│   ├── permissions.py            # Custom RBAC permissions
│   ├── validators.py             # Password validators
│   ├── admin.py                  # Django admin config
│   └── tests.py                  # Unit tests
│
├── my_backend/                   # Django project configuration
│   ├── settings.py               # Project settings
│   ├── urls.py                   # Root URL config
│   ├── wsgi.py                   # WSGI entry point
│   └── asgi.py                   # ASGI entry point (channels)
│
├── media/                        # User uploads (avatars)
│   └── avatars/                  # UUID-named avatar files
│
├── API_GUIDE.md                  # Complete API reference
├── API_USAGE.md                  # Legacy API documentation
├── BACKEND_README.md             # This file
├── Dockerfile                    # Container definition
├── docker-compose.yml            # Service orchestration
├── manage.py                     # Django CLI
├── migrate.sh                    # Migration helper script
├── run.sh                        # Server startup script
└── requirements.txt              # Python dependencies
```

---

## Core Features

### 1. User Authentication & Profiles

- **JWT Authentication** with access/refresh token flow
- **Automatic Owner Assignment** - First registered user becomes system Owner
- **Profile System** with avatar uploads, accent colors, and roles
- **Password Policy** - Minimum 4 characters + 1 uppercase letter

### 2. Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `owner` | Full system control, superuser access, Django admin |
| `admin` | Manage users, rooms, device types, approve proposals |
| `user` | Manage own devices, propose device types, control any device |
| `viewer` | Read-only access to dashboard |

### 3. Room Management

- Organize devices by physical location
- CRUD operations restricted to Admin/Owner roles
- Cascade handling: deleted rooms → devices become "Unassigned"

### 4. Device Management

- Register IoT devices with IP addresses
- Assign to rooms and device types
- Track online/offline/error status
- FontAwesome icon customization

### 5. Device Type System

- **Proposal Workflow**: Users propose → Admins approve/deny
- **Node Builder Definition**: JSON schema for hardware structure
- **UI Card Templates**: Define frontend widget layouts
- **Control Mappings**: Link UI widgets to device state keys

### 6. Device State Control (Home Assistant Style)

- **Schema-less JSON State**: Flexible `current_state` field
- **Partial Updates**: Merge new values with existing state
- **Hardware Sync Hook**: Placeholder for MQTT/ESPHome integration
- **Simulation Mode**: Commands auto-set device to "online"

### 7. Network Topology Visualization

- **React Flow Compatible**: Returns nodes/edges graph structure
- **Radial Layout**: Gateway at center, devices in circle
- **Real-time Status**: Color-coded connections (green/red/amber)

### 8. Notification System

- **Multi-type Notifications**: Device events, approvals, system messages
- **Priority Levels**: Low, normal, high, urgent
- **Read Tracking**: Mark as read with timestamps
- **Admin Broadcasts**: Send to all users or specific roles
- **Auto-notifications**: Triggered on device type proposals/reviews
- **Flexible References**: JSON field for related object IDs
- **Rich Node Data**: IP, room, type, icon, current state

### 9. Dashboard Layout Sync

- **Personal Layouts**: Per-user dashboard grid persistence
- **Shared/Default Layout**: Admin-managed fallback for all users
- **Folder Grouping**: 2-4 devices in Apple/Google Home style folders
- **Cross-device Sync**: Replaces localStorage with backend persistence
- **Strict Validation**: Duplicate checks, existence verification, schema validation
- **Upsert Semantics**: PUT creates or replaces in one call
- **Device Order Preference**: Persisted grouping/sorting choice (`room`, `type`, `status`, `name`, `custom`) with user → admin → default fallback

### 10. Device Control & State Management

- **Optimistic UI Updates**: API returns *predicted* new state immediately (HTTP 202) for instant UI feedback.
- **Async Hardware Sync**: Background MQTT process confirms actual device state later.
- **Dynamic Key Mapping**: Automatically maps standard keys (`relay_1`) to dynamic widget IDs (`switch-177...`).
- **State Persistence**: Firmware saves state to NVS (flash) to restore ON/OFF status after power loss.
- **Auto-Discovery**: Devices self-report capabilities and IP/MAC via mDNS and MQTT.

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Profile     │
│  (Django Auth)  │◄──────│                 │
│                 │  1:1  │  - avatar       │
│  - username     │       │  - role         │
│  - email        │       │  - accent_color │
│  - password     │       │                 │
└─────────────────┘       └─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐       ┌─────────────────┐
│      Room       │       │     Device      │
│                 │◄──────│                 │
│  - name         │  N:1  │  - name         │
│  - user (FK)    │       │  - ip_address   │
│                 │       │  - status       │
└─────────────────┘       │  - icon         │
                          │  - current_state│
                          │  - room (FK)    │
                          │  - user (FK)    │
                          │  - device_type  │
                          └─────────────────┘
                                  │
                                  │ N:1
                                  ▼
                          ┌─────────────────┐       ┌──────────────────┐
                          │ CustomDeviceType│◄──────│ DeviceCardTemplate│
                          │                 │  1:1  │                  │
                          │  - name         │       │  - layout_config │
                          │  - definition   │       │                  │
                          │  - approved     │       └──────────────────┘
                          │  - rejection_   │               │
                          │    reason       │               │ 1:N
                          │  - proposed_by  │               ▼
                          └─────────────────┘
                                                    ┌──────────────────┐
                                                    │  DeviceControl   │
                                                    │                  │
                                                    │  - widget_type   │
                                                    │  - label         │
                                                    │  - variable_     │
                                                    │    mapping       │
                                                    │  - min/max/step  │
                                                    └──────────────────┘
```

### Model Definitions

#### Profile
Extends Django's User model with smart home specific fields.

| Field | Type | Description |
|-------|------|-------------|
| `user` | OneToOne → User | Link to auth user |
| `avatar` | ImageField | Profile picture (UUID filename) |
| `role` | CharField | owner / admin / user / viewer |
| `accent_color` | CharField | UI theme color (hex) |

#### Room
Physical location grouping for devices.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Room name |
| `user` | ForeignKey → User | Room creator |

#### Device
IoT device registered in the system.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Display name |
| `ip_address` | GenericIPAddressField | IPv4 address |
| `status` | CharField | online / offline / error |
| `icon` | CharField | FontAwesome class |
| `device_type` | ForeignKey → CustomDeviceType | Hardware type |
| `room` | ForeignKey → Room | Physical location |
| `user` | ForeignKey → User | Owner |
| `current_state` | JSONField | Operational state |

#### CustomDeviceType
Definition of a device category with hardware structure.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Unique type name |
| `definition` | JSONField | Node builder structure |
| `approved` | BooleanField | Admin approval status |
| `rejection_reason` | TextField | Denial explanation |
| `proposed_by` | ForeignKey → User | User who proposed this type |
| `created_at` | DateTimeField | Creation timestamp |

#### DeviceCardTemplate
UI layout configuration for device cards.

| Field | Type | Description |
|-------|------|-------------|
| `device_type` | OneToOne → CustomDeviceType | Parent type |
| `layout_config` | JSONField | Grid dimensions (w, h) |

#### DeviceControl
Individual UI widget definition.

| Field | Type | Description |
|-------|------|-------------|
| `template` | ForeignKey → DeviceCardTemplate | Parent template |
| `widget_type` | CharField | See widget types table below |
| `label` | CharField | Display label |
| `variable_mapping` | CharField | State key (e.g., "relay_1") |
| `min_value` | FloatField | Slider/gauge minimum |
| `max_value` | FloatField | Slider/gauge maximum |
| `step` | FloatField | Slider increment |
| `variant` | CharField | Layout variant: row / square / compact |
| `size` | CharField | Size preset: sm / md / lg |
| `unit` | CharField | Display unit (e.g., "°C", "%", "ppm") |

**Widget Types:**

| Category | Widget Type | Description |
|----------|-------------|-------------|
| **Interactive** | `TOGGLE` | Boolean on/off switch |
| | `SLIDER` | Numeric range control (requires min/max/step) |
| | `GAUGE` | Read-only numeric display |
| | `BUTTON` | Trigger action button |
| **Sensors** | `TEMPERATURE` | Temperature reading display |
| | `HUMIDITY` | Humidity reading display |
| | `MOTION` | Motion detection indicator |
| | `LIGHT` | Light level display |
| | `CO2` | CO2 level display |
| | `PRESSURE` | Pressure reading display |
| | `POWER` | Power consumption display |
| | `BATTERY` | Battery level display |
| | `STATUS` | Generic status display |

#### Notification
User notification for alerts and system messages.

| Field | Type | Description |
|-------|------|-------------|
| `user` | ForeignKey → User | Notification recipient |
| `notification_type` | CharField | Type of notification (see below) |
| `title` | CharField(200) | Notification title |
| `message` | TextField | Full message content |
| `priority` | CharField | low / normal / high / urgent |
| `is_read` | BooleanField | Read status |
| `reference_data` | JSONField | Related object IDs (e.g., device_type_id) |
| `action_url` | CharField | Optional link for action button |
| `created_at` | DateTimeField | When notification was created |
| `read_at` | DateTimeField | When notification was read |

**Notification Types:**

| Type | Description |
|------|-------------|
| `device_type_pending` | Admin: New device type awaiting approval |
| `device_type_approved` | User: Device type was approved |
| `device_type_denied` | User: Device type was denied |
| `device_offline` | Device went offline |
| `device_online` | Device came online |
| `device_error` | Device has an error |
| `system` | General system notification |
| `info` | Informational message |
| `warning` | Warning message |
| `error` | Error message |

#### DashboardLayout
Persists the dashboard grid layout per user or as a shared default.

| Field | Type | Description |
|-------|------|-------------|
| `user` | OneToOne → User (nullable) | Owner of layout. NULL = shared layout |
| `layout` | JSONField | Layout JSON (`{version, items[]}`) |
| `device_order` | CharField(20) | Device grouping preference: `room` (default), `type`, `status`, `name`, `custom` |
| `updated_at` | DateTimeField | Last modification timestamp |

---

## Authentication System

### JWT Flow

```
┌──────────┐                              ┌──────────┐
│  Client  │                              │  Server  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  POST /api/login/                       │
     │  {username, password}                   │
     │────────────────────────────────────────►│
     │                                         │
     │  {access: "...", refresh: "..."}        │
     │◄────────────────────────────────────────│
     │                                         │
     │  GET /api/devices/                      │
     │  Authorization: Bearer <access>         │
     │────────────────────────────────────────►│
     │                                         │
     │  [device list]                          │
     │◄────────────────────────────────────────│
     │                                         │
     │  (access token expires)                 │
     │                                         │
     │  POST /api/token/refresh/               │
     │  {refresh: "..."}                       │
     │────────────────────────────────────────►│
     │                                         │
     │  {access: "..."}                        │
     │◄────────────────────────────────────────│
```

### Permission Classes

```python
# api/permissions.py

class IsOwner(BasePermission):
    """Requires 'owner' role"""
    
class IsAdmin(BasePermission):
    """Requires 'owner' or 'admin' role"""
    
class IsOwnerOrReadOnly(BasePermission):
    """Write requires object ownership, read allowed for all"""
```

---

## Device Control System

HomeForge uses a **schema-less state model** inspired by Home Assistant, enabling support for any DIY device without database migrations.

### Control Flow

```
┌──────────────┐     PATCH /devices/5/state/    ┌──────────────┐
│   Frontend   │    {"relay_1": true}           │   Backend    │
│   (React)    │───────────────────────────────►│   (Django)   │
└──────────────┘                                └──────┬───────┘
                                                       │
                                                       │ 1. Merge with current_state
                                                       │ 2. Set status = "online"
                                                       │ 3. Call sync_with_hardware()
                                                       ▼
                                                ┌──────────────┐
                                                │  PostgreSQL  │
                                                │              │
                                                │ current_state│
                                                │ = {"relay_1":│
                                                │    true}     │
                                                └──────────────┘
                                                       │
                                                       │ Future: MQTT publish
                                                       ▼
                                                ┌──────────────┐
                                                │  ESP32/IoT   │
                                                │   Device     │
                                                └──────────────┘
```

### State Schema Flexibility

```json
// Light device
{"relay_1": true, "brightness": 75}

// RGB Strip
{"relay_1": true, "color": "#FF5500", "mode": "rainbow"}

// Thermostat
{"target_temp": 22.5, "current_temp": 21.3, "mode": "heat"}

// DIY Multi-relay Board
{"relay_1": false, "relay_2": true, "relay_3": true, "relay_4": false}
```

### UI Widget Mapping

The `DeviceCardTemplate` system tells the frontend how to render controls:

```json
{
  "controls": [
    {
      "widget_type": "TOGGLE",
      "label": "Power",
      "variable_mapping": "relay_1"
    },
    {
      "widget_type": "SLIDER",
      "label": "Brightness",
      "variable_mapping": "brightness",
      "min_value": 0,
      "max_value": 100,
      "step": 5
    }
  ]
}
```

The frontend reads `variable_mapping` to know which `current_state` key to display/modify.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Git

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd homeforge/backend

# Start services
docker-compose up -d --build

# Run migrations
docker exec -it homeforge-web bash migrate.sh

# The API is now available at http://localhost:8000
```

### First User Setup

The **first registered user** automatically becomes the system **Owner** with:
- Full administrative privileges
- Django Admin access (`/admin/`)
- Superuser status

```bash
# Register first user via API
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com", "password": "Admin123"}'
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_NAME` | `HomeForge_db` | PostgreSQL database name |
| `DB_USER` | `myuser` | Database user |
| `DB_PASS` | `mypassword` | Database password |
| `DB_HOST` | `db` | Database host (Docker service) |
| `DJANGO_DEBUG` | `True` | Debug mode |

### Django Settings

Key configurations in `my_backend/settings.py`:

```python
# Authentication
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# CORS (allow frontend origin)
CORS_ALLOW_ALL_ORIGINS = True  # Configure for production

# Password Validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 4}},
    {'NAME': 'api.validators.UppercaseValidator'},
]
```

### Media Files

User uploads (avatars) are stored in `/app/media/avatars/` with UUID filenames to prevent conflicts. Old avatars are automatically deleted when replaced.

---

## API Reference

For complete API documentation including all endpoints, request/response schemas, and code examples, see:

📘 **[API_GUIDE.md](API_GUIDE.md)** - Complete API Reference

### Quick Endpoint Summary

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /register/`, `POST /login/`, `POST /token/refresh/` |
| **Profile** | `GET /me/`, `PUT /me/` |
| **Users** | `GET /users/`, `GET /users/{id}/`, `PUT /users/{id}/` |
| **Rooms** | `GET /rooms/`, `POST /rooms/`, `PUT /rooms/{id}/`, `DELETE /rooms/{id}/` |
| **Devices** | `GET /devices/`, `POST /devices/`, `PUT /devices/{id}/`, `DELETE /devices/{id}/` |
| **Device State** | `PATCH /devices/{id}/state/` |
| **Device Types** | `GET /device-types/`, `POST /device-types/propose/` |
| **Admin Review** | `GET /admin/device-types/pending/`, `GET/PUT/PATCH /admin/device-types/{id}/` |
| **Admin Actions** | `POST /admin/device-types/{id}/approve/`, `POST /admin/device-types/{id}/deny/` |
| **Denied Types** | `GET /admin/device-types/denied/`, `DELETE /admin/device-types/denied/{id}/`, `DELETE /admin/device-types/denied/delete/` |
| **Notifications** | `GET /notifications/`, `GET /notifications/unread-count/`, `POST /notifications/{id}/read/`, `POST /notifications/read-all/` |
| **Admin Notif** | `POST /admin/notifications/create/`, `POST /admin/notifications/broadcast/` |
| **Topology** | `GET /topology/` |

---

## Development

### Running Tests

```bash
# Inside container
docker exec -it homeforge-web python manage.py test

# With coverage
docker exec -it homeforge-web coverage run manage.py test
docker exec -it homeforge-web coverage report
```

### Database Migrations

```bash
# Create new migration
docker exec -it homeforge-web python manage.py makemigrations

# Apply migrations
docker exec -it homeforge-web python manage.py migrate

# Or use helper script
docker exec -it homeforge-web bash migrate.sh
```

### Management Commands

```bash
# Check device connectivity (updates status based on ping)
docker exec -it homeforge-web python manage.py monitor_devices

# Create superuser manually
docker exec -it homeforge-web python manage.py createsuperuser
```

### Code Style

- Follow PEP 8 guidelines
- Use type hints for function signatures
- Never use `fields = '__all__'` in serializers
- Always add `related_name` on ForeignKeys
- Use `select_related()` / `prefetch_related()` to avoid N+1 queries

---

## Performance Optimizations

The HomeForge backend includes several performance optimizations for production-ready performance.

### Query Optimization

All views use **`select_related()`** and **`prefetch_related()`** to prevent N+1 query problems:

```python
# Device queries include related room, user, and device_type
Device.objects.select_related(
    'room', 'user', 'device_type', 'device_type__card_template'
).prefetch_related(
    'device_type__card_template__controls'
)

# Room queries prefetch related devices
Room.objects.select_related('user').prefetch_related('devices')
```

### Database Indexes

Optimized indexes are applied to frequently queried fields:

| Model | Index | Fields |
|-------|-------|--------|
| `Device` | `device_user_status_idx` | `user`, `status` |
| `Device` | `device_room_idx` | `room` |
| `Device` | `device_type_idx` | `device_type` |
| `CustomDeviceType` | `devicetype_approved_idx` | `approved`, `created_at` |

### Caching

Approved device types are cached to reduce database load:

```python
# Cache configuration (settings.py)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'homeforge-cache',
        'TIMEOUT': 300,  # 5 minutes
    }
}
```

For production with multiple workers, use Redis:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379'),
    }
}
```

### Pagination

API list endpoints are paginated by default:

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}
```

Response format for paginated endpoints:

```json
{
  "count": 150,
  "next": "http://localhost:8000/api/devices/?page=2",
  "previous": null,
  "results": [...]
}
```

### TopologyView Optimization

The topology endpoint is optimized with:

- **Single query evaluation** - Devices fetched once and converted to list
- **Pre-computed mappings** - Status colors calculated once
- **Selective field loading** - Uses `.only()` to fetch required fields

---

## Roadmap

### Planned Features

- [ ] **WebSocket Support** - Real-time device state updates via Django Channels
- [ ] **MQTT Integration** - Direct communication with IoT devices
- [ ] **ESPHome API** - Native ESPHome device support
- [ ] **Automation Engine** - Rule-based device control
- [ ] **Scene Management** - Preset device state configurations
- [ ] **Energy Monitoring** - Track device power consumption
- [ ] **Mobile App** - React Native companion app

---

## License

This project is open source. See LICENSE file for details.

---

## Changelog

### v1.4.0 (February 2, 2026)

#### New Features
- **Notification System** - Complete notification API with 10 notification types
  - User notifications with read/unread tracking
  - Priority levels (low, normal, high, urgent)
  - Admin broadcast to all users or specific roles
  - Auto-notifications on device type proposals
  - Bulk read/delete operations

- **Denied Device Types Management**
  - List denied device types: `GET /admin/device-types/denied/`
  - Delete single: `DELETE /admin/device-types/denied/{id}/`
  - Bulk delete: `DELETE /admin/device-types/denied/delete/`
  - Separate pending (awaiting review) from denied (rejected)

#### Performance Optimizations
- Added `select_related()` and `prefetch_related()` to all views
- Database indexes on frequently queried fields:
  - `Device`: user+status, room, device_type
  - `CustomDeviceType`: approved+created_at
  - `Notification`: user+is_read, user+type, created_at
- Caching for approved device types (5-minute TTL)
- Pagination enabled (50 items per page default)
- TopologyView optimized with single query evaluation

#### Extended Widget Types
- Added sensor widgets: TEMPERATURE, HUMIDITY, MOTION, LIGHT, CO2, PRESSURE, POWER, BATTERY, STATUS
- Added BUTTON widget for trigger actions
- New optional display fields: `variant`, `size`, `unit`

#### Bug Fixes
- Removed auto-creation of mock data in TopologyView
- Fixed admin device type editing (GET/PUT/PATCH support)

#### Database Migrations
- `0016_add_extended_widget_types` - Widget types and display fields
- `0017_add_performance_indexes` - Database indexes
- `0018_add_notification_model` - Notification system
- `0019_add_proposed_by_to_customdevicetype` - Device type proposer tracking
- `0020_add_dashboard_layout` - Dashboard layout persistence
- `0021_add_device_order_to_dashboard_layout` - Device order preference field

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For backend changes, remember to update [API_GUIDE.md](API_GUIDE.md) as per the documentation guidelines.
