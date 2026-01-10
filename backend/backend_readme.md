# HomeForge Backend Documentation

This repository contains the backend API for the **HomeForge** smart home application. It is built using **Django** and **Django REST Framework (DRF)**, backed by a **PostgreSQL** database, and containerized with **Docker**.

## 🏗️ Tech Stack

- **Language**: Python 3.11+
- **Framework**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Authentication**: JWT (via `djangorestframework-simplejwt`)
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose
- **Image Processing**: Pillow (for avatar handling)

---

## 📂 Project Structure

```
/app
├── api/                 # Main application logic
│   ├── migrations/      # Database migrations
│   ├── models.py        # Database models (Profile, Room, Device)
│   ├── serializers.py   # DRF Serializers
│   ├── views.py         # API Views & Business Logic
│   ├── urls.py          # API Route definitions
│   ├── validators.py    # Custom validators (Password)
│   └── permissions.py   # Custom permissions (IsOwner, IsAdmin)
├── my_backend/          # Project configuration
│   ├── settings.py      # Django settings
│   ├── urls.py          # Root URL configuration
│   └── wsgi.py          # WSGI entry point
├── media/               # User-uploaded content (Avatars)
├── API_USAGE.md         # Frontend integration guide
├── backend_readme.md    # This file
├── docker-compose.yml   # Docker services configuration
├── Dockerfile           # Backend container definition
├── manage.py            # Django management script
└── requirements.txt     # Python dependencies
```

---

## 🔑 Key Features

### 1. Authentication & User Management
- **JWT Authentication**: Secure stateless authentication using Access and Refresh tokens.
- **Registration**:
    - **First User Admin**: The first user registered is automatically granted **Owner** role and **Superuser** status (access to Django Admin).
    - **Password Policy**: Enforced via `UppercaseValidator` (must contain 1 uppercase letter) and `MinimumLengthValidator` (min 4 chars).
- **Profile Management**:
    - Users can update `username`, `email`, `first_name`, `last_name`, and `password`.
    - **Avatar System**:
        - Uploads are saved with random UUID filenames to prevent conflicts.
        - Old avatars are automatically deleted from the filesystem when replaced.
    - **Customization**: Users can set an `accent_color` (default: `#3B82F6`).

### 2. Role-Based Access Control (RBAC)
- **Roles**:
    - `owner`: Full access (Superuser).
    - `admin`: Administrative access.
    - `user`: Standard access.
    - `viewer`: Read-only access.
- **Permissions**: Custom permission classes `IsOwner` and `IsAdmin` are available in `api/permissions.py`.

### 3. Device Topology & Simulation
- **Models**:
    - `Room`: Represents a physical room in the home.
    - `Device`: Represents a smart device (Light, Thermostat, etc.) linked to a Room.
- **Topology API** (`GET /api/topology/`):
    - Returns a hierarchical JSON structure of the home network.
    - **Mock Data**: Automatically generates 10 devices and a "Living Room" for new users if no devices exist.
    - **Live Simulation**: Randomly toggles the online/offline status of ~30% of devices on every request to simulate a real-time network environment.

### 4. Admin & Infrastructure (Phase 1)
- **Room Management**: 
    - Full CRUD capability for Rooms.
    - Restricted to Owners/Admins for modification.
- **User Administration**:
    - Admins can list all users and edit their profiles (including Role assignment).
- **Device Type Management**:
    - Centralized list of allowed Device Types.
    - Approval workflow: Users can request types (defaults to `approved=False`), Admins approve them.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose

### Installation & Running
1.  **Build and Start**:
    ```bash
    docker-compose up -d --build
    ```
    This starts the `web` (Django) and `db` (PostgreSQL) services.
    - **API**: `http://localhost:8000`
    - **Database**: Persisted in `postgres_data` volume.

2.  **Create Admin User**:
    Simply register the **first user** via the API (`POST /api/register/`). They will automatically become the Admin.

3.  **Access Django Admin**:
    Go to `http://localhost:8000/admin/` and log in with your registered credentials.

---

## 📚 API Documentation

For detailed API usage, request payloads, and examples, please refer to **[API_USAGE.md](API_USAGE.md)**.

### Quick Endpoint Summary
- `POST /api/register/` - Create account
- `POST /api/login/` - Get JWT tokens
- `POST /api/token/refresh/` - Refresh access token
- `GET /api/me/` - Get profile details
- `PUT /api/me/` - Update profile (Avatar, Password, etc.)
- `GET /api/topology/` - Get network topology (with simulation)

---

## 🛠️ Configuration Details

### Database
- **Engine**: PostgreSQL
- **Name**: `HomeForge_db`
- **User**: `myuser`
- **Password**: `mypassword`
- **Host**: `db` (Docker service name)

### Environment Variables
Defined in `docker-compose.yml`:
- `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST`

### Static & Media Files
- **Media Root**: `/app/media/` (Stores user avatars)
- **Static URL**: `/static/`

---

## 📝 Development History

### Initial Setup
- Configured Django project structure.
- Set up Docker environment with PostgreSQL.
- Implemented basic JWT authentication.

### Enhancements (Current State)
- **Rebranding**: Renamed project references to **HomeForge**.
- **Security**: Added custom password validators.
- **UX**: Added avatar cleanup logic and UUID naming.
- **Features**: Added Device and Room models, implemented Topology API with mock simulation.
- **Infrastructure**: Added persistent Docker volumes to prevent data loss.

### 5. User Capabilities (Phase 2)
- **Device Type Proposal**:
    - Users can propose new device types via `POST /api/device-types/propose/`.
    - These are automatically marked as `approved=False`.
- **Device Registration**:
    - `POST /api/devices/`: Register actual hardware.
    - Limits selection to **Approved** device types only.
- **Topology Map**:
    - `GET /api/topology/` output updated to support **Nodes & Edges** format for React Flow visualization.

### 6. Background Tasks
- **Device Status Monitoring**:
    - A custom management command is available to check device connectivity.
    - Run manually or via Cron:
    ```bash
    python3 manage.py monitor_devices
    ```
    - **Logic**:
        - **Mock Devices** (IP starts with 192.168.1.1XX): Simulates random status (Online/Offline/Error).
        - **Real IPs**: Attempts a system `ping`.
        - Updates `status` field in database.
    - **Status Enum**:
        - `online`: Device reachable.
        - `offline`: Connectivity lost.
        - `error`: System error during check.
