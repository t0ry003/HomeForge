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
                                │ Future: MQTT/ESPHome
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      IOT HARDWARE LAYER                          │
│         ESP32 / ESP8266 / Raspberry Pi / DIY Devices            │
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
| `user` | Manage own devices, propose device types |
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
- **Rich Node Data**: IP, room, type, icon, current state

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
                          └─────────────────┘               ▼
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
| `widget_type` | CharField | TOGGLE / SLIDER / GAUGE |
| `label` | CharField | Display label |
| `variable_mapping` | CharField | State key (e.g., "relay_1") |
| `min_value` | FloatField | Slider/gauge minimum |
| `max_value` | FloatField | Slider/gauge maximum |
| `step` | FloatField | Slider increment |

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
                                                       │ 1. Validate ownership
                                                       │ 2. Merge with current_state
                                                       │ 3. Set status = "online"
                                                       │ 4. Call sync_with_hardware()
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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For backend changes, remember to update [API_GUIDE.md](API_GUIDE.md) as per the documentation guidelines.
