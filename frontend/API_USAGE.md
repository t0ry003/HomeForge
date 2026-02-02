# HomeForge API Guide

> **Version:** 1.4.0  
> **Base URL:** `http://localhost:8000/api/`  
> **Authentication:** JWT (JSON Web Tokens)  
> **Last Updated:** February 2, 2026

A comprehensive API reference for the HomeForge smart home management platform. This guide is designed for frontend developers and AI agents to build complete user interfaces.

---

## ⚠️ Maintainer Instructions

> **IMPORTANT:** This document is the authoritative API reference for frontend development. **Any changes to the backend API MUST be reflected here.**

### When to Update This Guide

Update this document whenever you:

1. **Add a new endpoint** - Document the full endpoint including method, URL, auth requirements, request/response schemas, and examples
2. **Modify an existing endpoint** - Update request parameters, response fields, or behavior descriptions
3. **Change authentication/permissions** - Update the Role-Based Access Control section and permission matrix
4. **Add/modify models** - Update the Data Models section with new fields or types
5. **Change validation rules** - Document new constraints in the relevant endpoint section
6. **Add error responses** - Include new error formats in the Error Handling section
7. **Deprecate functionality** - Mark deprecated endpoints clearly and provide migration guidance

### Update Checklist

When making backend changes, ensure you update:

- [ ] Relevant endpoint documentation (request/response examples)
- [ ] Quick Reference table at the bottom
- [ ] Data Models section (TypeScript interfaces)
- [ ] Permission Matrix if roles/access changed
- [ ] Integration Examples if API usage patterns changed
- [ ] Version number and "Last Updated" date in header

### Documentation Standards

- Use consistent formatting with existing sections
- Include complete request/response JSON examples
- Specify all field types, required/optional status, and constraints
- Document error responses for each endpoint
- Keep TypeScript interfaces in sync with actual response shapes

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Profile Management](#3-profile-management)
4. [Rooms](#4-rooms)
5. [Devices](#5-devices)
6. [Device Types](#6-device-types)
7. [Notifications](#7-notifications)
8. [Network Topology](#8-network-topology)
9. [Role-Based Access Control](#9-role-based-access-control)
10. [Data Models](#10-data-models)
11. [Error Handling](#11-error-handling)
12. [Integration Examples](#12-integration-examples)

---

## 1. Authentication

HomeForge uses **JWT (JSON Web Tokens)** for authentication via `djangorestframework-simplejwt`.

### Request Header Format
```http
Authorization: Bearer <access_token>
```

### 1.1 Register New User

Creates a new user account. The **first registered user** automatically becomes the system **Owner** with superuser privileges.

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/register/` | ❌ No |

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass1",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | ✅ | Unique username |
| `email` | string | ✅ | Unique email address |
| `password` | string | ✅ | Min 4 chars, must contain 1 uppercase letter |
| `first_name` | string | ❌ | User's first name |
| `last_name` | string | ❌ | User's last name |
| `role` | string | ❌ | One of: `owner`, `admin`, `user`, `viewer`. Default: `user` |

**Success Response (201 Created):**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "avatar": null,
    "role": "user",
    "accent_color": "#3B82F6"
  }
}
```

**Validation Rules:**
- Username must be unique
- Email must be unique and valid format
- Password must be at least 4 characters with 1 uppercase letter
- First user is automatically assigned `owner` role

---

### 1.2 Login (Obtain Tokens)

Authenticate and receive JWT access/refresh token pair.

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/login/` | ❌ No |

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "SecurePass1"
}
```

**Success Response (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Token | Usage | Lifetime |
|-------|-------|----------|
| `access` | Include in `Authorization` header for API requests | Short-lived (default: 5 minutes) |
| `refresh` | Use to obtain new access token | Long-lived (default: 1 day) |

---

### 1.3 Refresh Access Token

Obtain a new access token using a valid refresh token.

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/token/refresh/` | ❌ No |

**Request Body:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. User Management

Administrative endpoints for managing all users in the system.

> ⚠️ **Permission Required:** `admin` or `owner` role

### 2.1 List All Users

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/users/` | ✅ Yes | `admin` or `owner` |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "profile": {
      "avatar": "http://localhost:8000/media/avatars/abc123.jpg",
      "role": "owner",
      "accent_color": "#3B82F6"
    }
  },
  {
    "id": 2,
    "username": "janedoe",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "profile": {
      "avatar": null,
      "role": "user",
      "accent_color": "#3B82F6"
    }
  }
]
```

---

### 2.2 Get User Details

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/users/{id}/` | ✅ Yes | `admin` or `owner` |

**Success Response (200 OK):**
```json
{
  "id": 2,
  "username": "janedoe",
  "email": "jane@example.com",
  "first_name": "Jane",
  "last_name": "Doe",
  "profile": {
    "avatar": null,
    "role": "user",
    "accent_color": "#3B82F6"
  }
}
```

---

### 2.3 Update User (Admin Override)

Administrators can update any user's profile including role assignment.

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `PUT` | `/users/{id}/` | ✅ Yes | `admin` or `owner` |

**Content-Type:** `multipart/form-data` (for avatar upload) or `application/json`

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `username` | string | New username |
| `email` | string | New email |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `role` | string | User role: `owner`, `admin`, `user`, `viewer` |
| `accent_color` | string | Hex color code (e.g., `#FF5733`) |
| `avatar` | file | Profile image file |

**Success Response (200 OK):** Returns updated user object.

---

## 3. Profile Management

Endpoints for the currently authenticated user to manage their own profile.

### 3.1 Get Current User Profile

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/me/` | ✅ Yes |

**Success Response (200 OK):**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "avatar": "http://localhost:8000/media/avatars/abc123.jpg",
    "role": "owner",
    "accent_color": "#3B82F6"
  }
}
```

---

### 3.2 Update Current User Profile

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `PUT` | `/me/` | ✅ Yes |

**Content-Type:** `multipart/form-data`

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `username` | string | Update username |
| `email` | string | Update email |
| `first_name` | string | Update first name |
| `last_name` | string | Update last name |
| `password` | string | New password (optional - resets password if provided) |
| `role` | string | Update role (may require admin) |
| `accent_color` | string | UI theme accent color (hex) |
| `avatar` | file | Profile image upload |

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('first_name', 'Johnny');
formData.append('accent_color', '#FF5733');
formData.append('avatar', fileInput.files[0]);

await fetch('/api/me/', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: formData
});
```

**Success Response (200 OK):** Returns updated user object.

---

## 4. Rooms

Rooms represent physical locations in the smart home (e.g., "Living Room", "Kitchen").

### 4.1 List All Rooms

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/rooms/` | ✅ Yes | Any authenticated |

**Success Response (200 OK):**
```json
[
  { "id": 1, "name": "Living Room" },
  { "id": 2, "name": "Kitchen" },
  { "id": 3, "name": "Bedroom" }
]
```

---

### 4.2 Create Room

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `POST` | `/rooms/` | ✅ Yes | `admin` or `owner` |

**Request Body:**
```json
{
  "name": "Garage"
}
```

**Success Response (201 Created):**
```json
{
  "id": 4,
  "name": "Garage"
}
```

---

### 4.3 Get Room Details

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/rooms/{id}/` | ✅ Yes |

---

### 4.4 Update Room

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `PUT` | `/rooms/{id}/` | ✅ Yes | `admin` or `owner` |

**Request Body:**
```json
{
  "name": "Guest Bedroom"
}
```

---

### 4.5 Delete Room

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `DELETE` | `/rooms/{id}/` | ✅ Yes | `admin` or `owner` |

**Success Response:** `204 No Content`

> **Note:** Deleting a room sets `room = null` on associated devices (they become "Unassigned").

---

## 5. Devices

Devices represent IoT hardware in the smart home (lights, thermostats, sensors, etc.).

### 5.1 List All Devices

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/devices/` | ✅ Yes |

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Kitchen Light",
    "ip_address": "192.168.1.50",
    "status": "online",
    "icon": "fa-lightbulb",
    "device_type": 1,
    "device_type_name": "Smart Light",
    "room": 2,
    "room_name": "Kitchen",
    "room_id": 2,
    "current_state": { "relay_1": true, "brightness": 75 }
  }
]
```

---

### 5.2 Register New Device

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/devices/` | ✅ Yes |

**Request Body:**
```json
{
  "name": "Living Room Lamp",
  "ip_address": "192.168.1.51",
  "device_type": 1,
  "room": 1,
  "icon": "fa-lightbulb"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Device display name (max 100 chars) |
| `ip_address` | string | ✅ | IPv4 address of the device |
| `device_type` | integer | ✅ | ID of an **approved** `CustomDeviceType` |
| `room` | integer | ❌ | ID of a Room (optional) |
| `icon` | string | ❌ | FontAwesome icon class. Default: `fa-cube` |

**Validation Rules:**
- `device_type` must reference an approved device type
- `ip_address` must be a valid IPv4 address

**Success Response (201 Created):**
```json
{
  "id": 5,
  "name": "Living Room Lamp",
  "ip_address": "192.168.1.51",
  "status": "offline",
  "icon": "fa-lightbulb",
  "device_type": 1,
  "device_type_name": "Smart Light",
  "room": 1,
  "room_name": "Living Room",
  "room_id": 1,
  "current_state": {}
}
```

---

### 5.3 Get Device Details

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/devices/{id}/` | ✅ Yes |

---

### 5.4 Update Device

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `PUT` / `PATCH` | `/devices/{id}/` | ✅ Yes |

**Request Body (partial update allowed):**
```json
{
  "name": "Updated Lamp Name",
  "room": 3,
  "icon": "fa-sun"
}
```

---

### 5.5 Delete Device

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `DELETE` | `/devices/{id}/` | ✅ Yes |

**Success Response:** `204 No Content`

---

### 5.6 Update Device State (Control Device)

Send control commands to a device. This endpoint simulates hardware control by updating the device's operational state.

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `PATCH` | `/devices/{id}/state/` | ✅ Yes |

**Request Body:**
```json
{
  "relay_1": true,
  "brightness": 75,
  "color_temp": 4500
}
```

**Behavior:**
1. Merges provided key-value pairs with existing `current_state`
2. Sets device `status` to `online` (simulating successful command receipt)
3. Triggers hardware sync hook (logging for future MQTT integration)

**Success Response (200 OK):**
```json
{
  "status": "State updated",
  "device_status": "online",
  "current_state": {
    "relay_1": true,
    "brightness": 75,
    "color_temp": 4500
  }
}
```

**Error Responses:**
- `403 Forbidden`: User doesn't own this device
- `404 Not Found`: Device not found
- `400 Bad Request`: State must be a JSON object

---

## 6. Device Types

Device Types define the hardware specification and UI template for a category of devices.

### 6.1 List Device Types

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/device-types/` | ✅ Yes |

**Visibility Rules:**
- **Admin/Owner:** Sees all device types (including pending)
- **User/Viewer:** Sees only approved device types

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Smart Light",
    "definition": {
      "name": "Light v1",
      "structure": [
        { "id": "mcu-1", "type": "mcu", "label": "ESP32" },
        { "id": "relay_1", "type": "relay", "label": "Power" }
      ]
    },
    "approved": true,
    "rejection_reason": null,
    "created_at": "2026-01-15T10:30:00Z",
    "card_template": {
      "id": 1,
      "layout_config": { "w": 2, "h": 2 },
      "controls": [
        {
          "id": 1,
          "widget_type": "TOGGLE",
          "label": "Power",
          "variable_mapping": "relay_1",
          "min_value": null,
          "max_value": null,
          "step": null
        }
      ]
    }
  }
]
```

---

### 6.2 Propose New Device Type (User Submission)

Any authenticated user can propose a new device type for admin review.

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/device-types/propose/` | ✅ Yes |

**Request Body:**
```json
{
  "name": "Smart Fan",
  "definition": {
    "name": "Fan v1",
    "structure": [
      { "id": "mcu-1", "type": "mcu", "label": "ESP32", "position": { "x": 50, "y": 50 } },
      { "id": "relay_1", "type": "relay", "label": "Power", "position": { "x": 150, "y": 50 } },
      { "id": "pwm_1", "type": "pwm", "label": "Speed Control", "position": { "x": 150, "y": 150 } }
    ]
  },
  "card_template": {
    "layout_config": { "w": 2, "h": 2 },
    "controls": [
      {
        "widget_type": "TOGGLE",
        "label": "Master Power",
        "variable_mapping": "relay_1"
      },
      {
        "widget_type": "SLIDER",
        "label": "Fan Speed",
        "variable_mapping": "pwm_1",
        "min_value": 0,
        "max_value": 100,
        "step": 10
      }
    ]
  }
}
```

**Validation Rules:**
- `name` must be unique
- Every `variable_mapping` in controls must match an `id` in `definition.structure`
- Always created with `approved: false`

---

### 6.3 Get Device Type Details

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/device-types/{id}/` | ✅ Yes |

---

### 6.4 Update Device Type

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `PUT` | `/device-types/{id}/` | ✅ Yes | `admin` or `owner` |

---

### 6.5 Delete Device Type

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `DELETE` | `/device-types/{id}/` | ✅ Yes | `admin` or `owner` |

---

### 6.6 List Pending Device Types (Admin)

Get all unapproved device types awaiting review.

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/admin/device-types/pending/` | ✅ Yes | `admin` or `owner` |

---

### 6.7 Get Device Type Details for Editing (Admin)

Get full device type details including both `definition` (node topology) and `card_template` (UI controls) for the admin editor.

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/admin/device-types/{id}/` | ✅ Yes | `admin` or `owner` |

**Success Response (200 OK):**
```json
{
  "id": 3,
  "name": "Smart Fan",
  "definition": {
    "name": "Fan v1",
    "structure": [
      { "id": "mcu-1", "type": "mcu", "label": "ESP32", "position": { "x": 50, "y": 50 } },
      { "id": "relay_1", "type": "relay", "label": "Power", "position": { "x": 150, "y": 50 } },
      { "id": "pwm_1", "type": "pwm", "label": "Speed Control", "position": { "x": 150, "y": 150 } }
    ]
  },
  "approved": false,
  "rejection_reason": null,
  "created_at": "2026-01-15T10:30:00Z",
  "card_template": {
    "id": 5,
    "layout_config": { "w": 2, "h": 2 },
    "controls": [
      {
        "id": 10,
        "widget_type": "TOGGLE",
        "label": "Master Power",
        "variable_mapping": "relay_1",
        "min_value": null,
        "max_value": null,
        "step": null
      },
      {
        "id": 11,
        "widget_type": "SLIDER",
        "label": "Fan Speed",
        "variable_mapping": "pwm_1",
        "min_value": 0,
        "max_value": 100,
        "step": 10
      }
    ]
  }
}
```

> **Frontend Note:** This endpoint returns the complete device type with both the **node topology** (`definition.structure`) for the Node Builder editor AND the **UI controls** (`card_template.controls`) for the Control Editor. Display both in your admin edit interface.

---

### 6.8 Edit Device Type (Admin) - Full Update

Update both the node topology (`definition`) and UI controls (`card_template`) of a device type proposal.

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `PUT` | `/admin/device-types/{id}/` | ✅ Yes | `admin` or `owner` |

**Request Body:**
```json
{
  "name": "Smart Fan v2",
  "definition": {
    "name": "Fan v2",
    "structure": [
      { "id": "mcu-1", "type": "mcu", "label": "ESP32", "position": { "x": 50, "y": 50 } },
      { "id": "relay_1", "type": "relay", "label": "Power", "position": { "x": 150, "y": 50 } },
      { "id": "pwm_1", "type": "pwm", "label": "Speed", "position": { "x": 150, "y": 150 } },
      { "id": "temp_1", "type": "sensor", "label": "Temperature", "position": { "x": 250, "y": 100 } }
    ]
  },
  "card_template": {
    "layout_config": { "w": 2, "h": 3 },
    "controls": [
      {
        "widget_type": "TOGGLE",
        "label": "Power",
        "variable_mapping": "relay_1"
      },
      {
        "widget_type": "SLIDER",
        "label": "Speed",
        "variable_mapping": "pwm_1",
        "min_value": 0,
        "max_value": 100,
        "step": 5
      },
      {
        "widget_type": "GAUGE",
        "label": "Temperature",
        "variable_mapping": "temp_1",
        "min_value": 0,
        "max_value": 50
      }
    ]
  }
}
```

**Success Response (200 OK):**
```json
{
  "status": "Updated",
  "data": { /* Full updated device type object */ }
}
```

**Behavior:**
- Replaces the entire `definition` with the new value
- Replaces the entire `card_template` and all `controls` (full sync)
- Validates that all `variable_mapping` keys exist in `definition.structure`
- Does NOT change the `approved` status (use approve/deny endpoints for that)

---

### 6.9 Edit Device Type (Admin) - Partial Update

Partially update a device type. Only the provided fields are updated.

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `PATCH` | `/admin/device-types/{id}/` | ✅ Yes | `admin` or `owner` |

**Request Body (example - update only the name):**
```json
{
  "name": "Smart Fan Pro"
}
```

**Request Body (example - update only card_template):**
```json
{
  "card_template": {
    "layout_config": { "w": 3, "h": 2 },
    "controls": [
      {
        "widget_type": "TOGGLE",
        "label": "Power Switch",
        "variable_mapping": "relay_1"
      }
    ]
  }
}
```

**Success Response (200 OK):**
```json
{
  "status": "Updated",
  "data": { /* Full updated device type object */ }
}
```

---

### 6.10 Approve Device Type (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `POST` | `/admin/device-types/{id}/approve/` | ✅ Yes | `admin` or `owner` |

**Success Response (200 OK):**
```json
{
  "status": "Approved",
  "data": { /* Full device type object */ }
}
```

---

### 6.11 Deny Device Type (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `POST` | `/admin/device-types/{id}/deny/` | ✅ Yes | `admin` or `owner` |

**Request Body:**
```json
{
  "reason": "Invalid relay configuration. Please revise the hardware structure."
}
```

**Success Response (200 OK):**
```json
{
  "status": "Denied",
  "data": {
    "id": 3,
    "name": "Smart Fan",
    "approved": false,
    "rejection_reason": "Invalid relay configuration. Please revise the hardware structure.",
    /* ... */
  }
}
```

---

### 6.12 List Denied Device Types (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `GET` | `/admin/device-types/denied/` | ✅ Yes | `admin` or `owner` |

Returns all denied device types (rejected proposals) that are stored for review or cleanup.

**Success Response (200 OK):**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 3,
      "name": "Smart Fan",
      "approved": false,
      "rejection_reason": "Invalid relay configuration",
      "created_at": "2026-01-28T10:30:00Z",
      "definition": { /* ... */ },
      "card_template": { /* ... */ }
    },
    {
      "id": 7,
      "name": "Broken Sensor",
      "approved": false,
      "rejection_reason": "Missing required fields",
      "created_at": "2026-01-25T14:22:00Z",
      "definition": { /* ... */ },
      "card_template": null
    }
  ]
}
```

---

### 6.13 Delete Single Denied Device Type (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `DELETE` | `/admin/device-types/denied/{id}/` | ✅ Yes | `admin` or `owner` |

Permanently deletes a specific denied device type.

**Success Response (200 OK):**
```json
{
  "status": "Deleted",
  "message": "Denied device type 'Smart Fan' has been deleted."
}
```

**Error Response (404 Not Found):**
```json
{
  "detail": "Denied device type not found."
}
```

---

### 6.14 Bulk Delete Denied Device Types (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `DELETE` | `/admin/device-types/denied/delete/` | ✅ Yes | `admin` or `owner` |

Delete multiple denied device types at once.

**Option 1: Delete ALL denied types (no request body)**

```http
DELETE /api/admin/device-types/denied/delete/
```

**Success Response (200 OK):**
```json
{
  "status": "Deleted",
  "message": "Deleted all 5 denied device type(s).",
  "deleted_count": 5
}
```

**Option 2: Delete specific types by ID**

**Request Body:**
```json
{
  "ids": [3, 7, 12]
}
```

**Success Response (200 OK):**
```json
{
  "status": "Deleted",
  "message": "Deleted 3 denied device type(s).",
  "deleted_count": 3
}
```

**Error Response (404 Not Found):**
```json
{
  "detail": "No matching denied device types found."
}
```

---

### 6.15 Admin Workflow Summary

The typical admin workflow for reviewing a device type proposal:

1. **List pending** - `GET /admin/device-types/pending/` to see types awaiting review
2. **View details** - `GET /admin/device-types/{id}/` to get full definition + card_template
3. **Edit if needed** - `PUT /admin/device-types/{id}/` or `PATCH /admin/device-types/{id}/` to fix issues
4. **Approve or deny** - `POST /admin/device-types/{id}/approve/` or `/deny/`
5. **Manage denied** - `GET /admin/device-types/denied/` to review rejected proposals
6. **Cleanup** - `DELETE /admin/device-types/denied/delete/` to remove old denied types

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  List Pending   │────►│  View Details   │────►│  Edit (if fix   │
│  GET /pending/  │     │  GET /{id}/     │     │  needed)        │
└─────────────────┘     └────────┬────────┘     │  PUT/PATCH      │
                                 │              └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │    Approve      │     │     Deny        │
                        │ POST /approve/  │     │  POST /deny/    │
                        └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  List Denied    │
                                                │  GET /denied/   │
                                                └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Delete Denied   │
                                                │DELETE /denied/  │
                                                └─────────────────┘
```
```

---

## 7. Notifications

Real-time notification system for alerts, approvals, and system messages.

### Notification Types

| Type | Description |
|------|-------------|
| `device_type_pending` | Admin: New device type awaiting approval |
| `device_type_approved` | User: Your device type was approved |
| `device_type_denied` | User: Your device type was denied |
| `device_offline` | Device went offline |
| `device_online` | Device came online |
| `device_error` | Device has an error |
| `system` | General system notification |
| `info` | Informational message |
| `warning` | Warning message |
| `error` | Error message |

### Priority Levels

| Priority | Use Case |
|----------|----------|
| `low` | Non-urgent, informational |
| `normal` | Standard notifications |
| `high` | Important, time-sensitive |
| `urgent` | Critical, requires immediate action |

---

### 7.1 List Notifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/notifications/` | ✅ Yes |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `is_read` | boolean | Filter by read status (`true`/`false`) |
| `type` | string | Filter by notification type |
| `priority` | string | Filter by priority level |

**Example Request:**
```http
GET /api/notifications/?is_read=false&type=device_type_pending
```

**Success Response (200 OK):**
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "notification_type": "device_type_pending",
      "notification_type_display": "Device Type Pending",
      "title": "New Device Type Proposal",
      "message": "'Smart Thermostat' has been proposed and is awaiting approval.",
      "priority": "normal",
      "priority_display": "Normal",
      "is_read": false,
      "reference_data": {
        "device_type_id": 5,
        "proposed_by": "johndoe"
      },
      "action_url": "/admin/device-types/5/",
      "created_at": "2026-02-02T10:30:00Z",
      "read_at": null,
      "time_ago": "2h ago"
    }
  ]
}
```

---

### 7.2 Get Unread Count

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/notifications/unread-count/` | ✅ Yes |

Returns the count of unread notifications, broken down by type.

**Success Response (200 OK):**
```json
{
  "unread_count": 5,
  "by_type": {
    "device_type_pending": 2,
    "system": 1,
    "device_offline": 2
  }
}
```

---

### 7.3 Get Single Notification

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/notifications/{id}/` | ✅ Yes |

**Success Response (200 OK):**
```json
{
  "id": 1,
  "notification_type": "device_type_pending",
  "notification_type_display": "Device Type Pending",
  "title": "New Device Type Proposal",
  "message": "'Smart Thermostat' has been proposed and is awaiting approval.",
  "priority": "normal",
  "priority_display": "Normal",
  "is_read": false,
  "reference_data": { "device_type_id": 5 },
  "action_url": "/admin/device-types/5/",
  "created_at": "2026-02-02T10:30:00Z",
  "read_at": null,
  "time_ago": "2h ago"
}
```

---

### 7.4 Mark Notification as Read

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/notifications/{id}/read/` | ✅ Yes |

**Success Response (200 OK):**
```json
{
  "status": "Marked as read",
  "notification": { /* full notification object */ }
}
```

---

### 7.5 Mark All Notifications as Read

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `POST` | `/notifications/read-all/` | ✅ Yes |

Mark all (or filtered) notifications as read.

**Query Parameters (optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Only mark notifications of this type |

**Request Body (optional):**
```json
{
  "ids": [1, 2, 3]
}
```

**Success Response (200 OK):**
```json
{
  "status": "Marked as read",
  "count": 5
}
```

---

### 7.6 Delete Notification

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `DELETE` | `/notifications/{id}/` | ✅ Yes |

**Success Response (204 No Content)**

---

### 7.7 Bulk Delete Notifications

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `DELETE` | `/notifications/bulk-delete/` | ✅ Yes |

**Request Options:**

1. **No body** - Deletes all READ notifications (cleanup)
2. **With IDs** - Delete specific notifications:
```json
{
  "ids": [1, 2, 3]
}
```
3. **Delete all** - Delete ALL notifications (read and unread):
```json
{
  "all": true
}
```

**Success Response (200 OK):**
```json
{
  "status": "Deleted",
  "count": 10
}
```

---

### 7.8 Create Notification (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `POST` | `/admin/notifications/create/` | ✅ Yes | `admin` or `owner` |

Create a notification for a specific user.

**Request Body:**
```json
{
  "user_id": 5,
  "notification_type": "system",
  "title": "Account Review",
  "message": "Your account has been reviewed and approved.",
  "priority": "normal",
  "action_url": "/profile/"
}
```

Or use username:
```json
{
  "username": "johndoe",
  "notification_type": "warning",
  "title": "Password Expiring",
  "message": "Your password will expire in 7 days.",
  "priority": "high"
}
```

**Success Response (201 Created):**
```json
{
  "id": 15,
  "notification_type": "system",
  "title": "Account Review",
  /* ... */
}
```

---

### 7.9 Broadcast Notification (Admin)

| Method | Endpoint | Auth Required | Role Required |
|--------|----------|---------------|---------------|
| `POST` | `/admin/notifications/broadcast/` | ✅ Yes | `admin` or `owner` |

Send a notification to multiple users at once.

**Request Body:**
```json
{
  "target": "all",
  "notification_type": "system",
  "title": "Scheduled Maintenance",
  "message": "The system will be under maintenance on Sunday from 2-4 AM.",
  "priority": "high",
  "action_url": "/announcements/"
}
```

**Target Options:**

| Target | Recipients |
|--------|------------|
| `all` | All users |
| `admins` | Admin and Owner users |
| `users` | Regular users |
| `viewers` | Viewer-role users |

**Success Response (200 OK):**
```json
{
  "status": "Broadcast sent",
  "recipients": 25,
  "target": "all"
}
```

---

### 7.10 Notification Data Model

```typescript
interface Notification {
  id: number;
  notification_type: 
    | 'device_type_pending'
    | 'device_type_approved'
    | 'device_type_denied'
    | 'device_offline'
    | 'device_online'
    | 'device_error'
    | 'system'
    | 'info'
    | 'warning'
    | 'error';
  notification_type_display: string;      // Human-readable type
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  priority_display: string;               // Human-readable priority
  is_read: boolean;
  reference_data: Record<string, any>;    // Related object IDs, metadata
  action_url: string | null;              // Link for action button
  created_at: string;                     // ISO datetime
  read_at: string | null;                 // ISO datetime when read
  time_ago: string;                       // Human-readable "2h ago"
}
```

---

## 8. Network Topology

Get a visual representation of the smart home network for rendering with graph libraries (e.g., React Flow).

| Method | Endpoint | Auth Required |
|--------|----------|---------------|
| `GET` | `/topology/` | ✅ Yes |

**Response Structure:**
```json
{
  "nodes": [
    {
      "id": "homeforge-gateway",
      "type": "input",
      "data": {
        "label": "HomeForge Gateway",
        "ip": "192.168.1.1",
        "status": "online",
        "type": "server",
        "room": "Server Room"
      },
      "position": { "x": 0, "y": 0 },
      "style": {
        "background": "#F3F4F6",
        "color": "#1F2937",
        "border": "2px solid #3B82F6",
        "borderRadius": "8px",
        "fontWeight": "bold"
      }
    },
    {
      "id": "15",
      "type": "device",
      "data": {
        "label": "Living Room Lamp",
        "ip": "192.168.1.105",
        "status": "online",
        "room": "Living Room",
        "device_type": "Smart Light",
        "icon": "fa-lightbulb",
        "current_state": { "relay_1": true }
      },
      "position": { "x": 250.5, "y": 145.2 },
      "style": {
        "width": 180,
        "borderColor": "#10B981",
        "borderWidth": "1px",
        "borderStyle": "solid",
        "padding": "10px",
        "borderRadius": "5px",
        "background": "white"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-homeforge-gateway-15",
      "source": "homeforge-gateway",
      "target": "15",
      "animated": true,
      "style": {
        "stroke": "#10B981",
        "strokeWidth": 2
      }
    }
  ]
}
```

**Node Types:**
| Type | Description |
|------|-------------|
| `input` | Central gateway/server node |
| `device` | IoT device node |

**Status Colors:**
| Status | Color |
|--------|-------|
| `online` | `#10B981` (green) |
| `offline` | `#EF4444` (red) |
| `error` | `#F59E0B` (amber) |

**Layout:** Radial positioning with gateway at center (0, 0) and devices distributed in a circle.

---

## 9. Role-Based Access Control

HomeForge implements a hierarchical role system.

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| `owner` | Highest | Full system control, first user automatically assigned |
| `admin` | High | Can manage users, rooms, device types, and devices |
| `user` | Standard | Can manage own devices, propose device types |
| `viewer` | Lowest | Read-only access |

### Permission Matrix

| Resource | Owner | Admin | User | Viewer |
|----------|-------|-------|------|--------|
| View devices | ✅ | ✅ | ✅ | ✅ |
| Create/Edit devices | ✅ | ✅ | ✅ | ❌ |
| Control device state | ✅ | ✅ | ✅ (own) | ❌ |
| View rooms | ✅ | ✅ | ✅ | ✅ |
| Create/Edit rooms | ✅ | ✅ | ❌ | ❌ |
| List users | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| View device types | ✅ All | ✅ All | ✅ Approved | ✅ Approved |
| Approve device types | ✅ | ✅ | ❌ | ❌ |
| Propose device types | ✅ | ✅ | ✅ | ❌ |

---

## 10. Data Models

### User Profile

```typescript
interface UserProfile {
  avatar: string | null;    // Full URL to avatar image
  role: 'owner' | 'admin' | 'user' | 'viewer';
  accent_color: string;     // Hex color code, default: "#3B82F6"
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}
```

### Room

```typescript
interface Room {
  id: number;
  name: string;             // Max 100 characters
}
```

### Device

```typescript
interface Device {
  id: number;
  name: string;                           // Max 100 characters
  ip_address: string;                     // IPv4 format
  status: 'online' | 'offline' | 'error';
  icon: string;                           // FontAwesome class, default: "fa-cube"
  device_type: number;                    // CustomDeviceType ID
  device_type_name: string;               // Read-only, resolved name
  room: number | null;                    // Room ID or null
  room_name: string | null;               // Read-only, resolved name
  room_id: number | null;                 // Read-only alias
  current_state: Record<string, any>;     // Key-value state object
}
```

### Device Type

```typescript
interface DeviceControl {
  id: number;
  widget_type: 
    // Interactive Controls
    | 'TOGGLE'       // Boolean on/off switch
    | 'SLIDER'       // Numeric range control
    | 'GAUGE'        // Read-only numeric display
    | 'BUTTON'       // Trigger action button
    // Sensor Displays
    | 'TEMPERATURE'  // Temperature reading display
    | 'HUMIDITY'     // Humidity reading display
    | 'MOTION'       // Motion detection indicator
    | 'LIGHT'        // Light level display
    | 'CO2'          // CO2 level display
    | 'PRESSURE'     // Pressure reading display
    | 'POWER'        // Power consumption display
    | 'BATTERY'      // Battery level display
    | 'STATUS';      // Generic status display
  label: string;                          // Display label
  variable_mapping: string;               // Key for current_state
  min_value: number | null;               // For SLIDER/GAUGE
  max_value: number | null;               // For SLIDER/GAUGE
  step: number | null;                    // For SLIDER
  // Optional display customization
  variant: 'row' | 'square' | 'compact' | null;  // Layout variant
  size: 'sm' | 'md' | 'lg' | null;               // Size preset
  unit: string | null;                           // Display unit (e.g., '°C', '%', 'ppm')
}

interface DeviceCardTemplate {
  id: number;
  layout_config: {                        // Grid layout hints
    w?: number;                           // Width in grid units
    h?: number;                           // Height in grid units
  };
  controls: DeviceControl[];
}

interface DeviceTypeDefinition {
  name?: string;
  structure: Array<{
    id: string;                           // Unique component ID
    type: string;                         // Component type (mcu, relay, pwm, sensor, etc.)
    label: string;                        // Display label
    position?: { x: number; y: number };  // For visual node builder
  }>;
}

interface CustomDeviceType {
  id: number;
  name: string;                           // Unique name
  definition: DeviceTypeDefinition;       // Hardware structure
  approved: boolean;
  rejection_reason: string | null;        // Set when denied
  created_at: string;                     // ISO datetime
  card_template: DeviceCardTemplate | null;
}
```

### Topology (React Flow Compatible)

```typescript
interface TopologyNode {
  id: string;
  type: 'input' | 'device';
  data: {
    label: string;
    ip: string;
    status: 'online' | 'offline' | 'error';
    room: string;
    device_type?: string;
    icon?: string;
    current_state?: Record<string, any>;
  };
  position: { x: number; y: number };
  style: Record<string, any>;
}

interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
  };
}

interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}
```

---

## 11. Error Handling

### Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "field_name": ["Error message for this field."],
  "non_field_errors": ["General error message."],
  "detail": "Permission or general error message."
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Validation error, malformed JSON |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |

### Common Error Examples

**Duplicate Username (400):**
```json
{
  "username": ["This username is already taken."]
}
```

**Duplicate Email (400):**
```json
{
  "email": ["This email is already registered."]
}
```

**Duplicate Device Type Name (400):**
```json
{
  "name": ["A device type with this name already exists."]
}
```

**Unapproved Device Type (400):**
```json
{
  "device_type": ["Device type must be approved."]
}
```

**Invalid Variable Mapping (400):**
```json
{
  "non_field_errors": ["Variable mapping 'invalid_key' in controls does not match any ID in the device definition."]
}
```

**Permission Denied (403):**
```json
{
  "detail": "Only Admins/Owners can perform this action."
}
```

**Invalid Token (401):**
```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid"
}
```

---

## 12. Integration Examples

### Complete Authentication Flow (JavaScript)

```javascript
class HomeForgeAPI {
  constructor(baseURL = 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    this.accessToken = data.access;
    this.refreshToken = data.refresh;
    return data;
  }

  async refreshAccessToken() {
    const response = await fetch(`${this.baseURL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: this.refreshToken })
    });
    const data = await response.json();
    this.accessToken = data.access;
    return data;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Auto-refresh on 401
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, options);
    }

    return response.json();
  }

  // Convenience methods
  getProfile() { return this.request('/me/'); }
  getDevices() { return this.request('/devices/'); }
  getRooms() { return this.request('/rooms/'); }
  getTopology() { return this.request('/topology/'); }
  getDeviceTypes() { return this.request('/device-types/'); }
  
  controlDevice(deviceId, state) {
    return this.request(`/devices/${deviceId}/state/`, {
      method: 'PATCH',
      body: JSON.stringify(state)
    });
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

function useDevices(api) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDevices()
      .then(setDevices)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [api]);

  const toggleDevice = async (deviceId, controlKey, value) => {
    const result = await api.controlDevice(deviceId, { [controlKey]: value });
    setDevices(prev => 
      prev.map(d => d.id === deviceId 
        ? { ...d, current_state: result.current_state, status: result.device_status }
        : d
      )
    );
    return result;
  };

  return { devices, loading, error, toggleDevice };
}
```

### React Flow Integration

```javascript
import ReactFlow from 'reactflow';

function NetworkTopology({ api }) {
  const [topology, setTopology] = useState({ nodes: [], edges: [] });

  useEffect(() => {
    api.getTopology().then(setTopology);
  }, [api]);

  return (
    <ReactFlow
      nodes={topology.nodes}
      edges={topology.edges}
      fitView
    />
  );
}
```

---

## Quick Reference

### All Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| `POST` | `/register/` | Register new user | ❌ | - |
| `POST` | `/login/` | Get JWT tokens | ❌ | - |
| `POST` | `/token/refresh/` | Refresh access token | ❌ | - |
| `GET` | `/me/` | Get current user | ✅ | Any |
| `PUT` | `/me/` | Update current user | ✅ | Any |
| `GET` | `/users/` | List all users | ✅ | Admin |
| `GET` | `/users/{id}/` | Get user details | ✅ | Admin |
| `PUT` | `/users/{id}/` | Update user | ✅ | Admin |
| `GET` | `/rooms/` | List rooms | ✅ | Any |
| `POST` | `/rooms/` | Create room | ✅ | Admin |
| `GET` | `/rooms/{id}/` | Get room | ✅ | Any |
| `PUT` | `/rooms/{id}/` | Update room | ✅ | Admin |
| `DELETE` | `/rooms/{id}/` | Delete room | ✅ | Admin |
| `GET` | `/devices/` | List devices | ✅ | Any |
| `POST` | `/devices/` | Register device | ✅ | Any |
| `GET` | `/devices/{id}/` | Get device | ✅ | Any |
| `PUT` | `/devices/{id}/` | Update device | ✅ | Any |
| `DELETE` | `/devices/{id}/` | Delete device | ✅ | Any |
| `PATCH` | `/devices/{id}/state/` | Control device | ✅ | Owner |
| `GET` | `/device-types/` | List device types | ✅ | Any |
| `POST` | `/device-types/propose/` | Propose type | ✅ | Any |
| `GET` | `/device-types/{id}/` | Get type details | ✅ | Any |
| `PUT` | `/device-types/{id}/` | Update type | ✅ | Admin |
| `DELETE` | `/device-types/{id}/` | Delete type | ✅ | Admin |
| `GET` | `/admin/device-types/pending/` | List pending | ✅ | Admin |
| `GET` | `/admin/device-types/denied/` | List denied | ✅ | Admin |
| `DELETE` | `/admin/device-types/denied/{id}/` | Delete denied type | ✅ | Admin |
| `DELETE` | `/admin/device-types/denied/delete/` | Bulk delete denied | ✅ | Admin |
| `GET` | `/admin/device-types/{id}/` | Get type for editing | ✅ | Admin |
| `PUT` | `/admin/device-types/{id}/` | Full update type | ✅ | Admin |
| `PATCH` | `/admin/device-types/{id}/` | Partial update type | ✅ | Admin |
| `POST` | `/admin/device-types/{id}/approve/` | Approve type | ✅ | Admin |
| `POST` | `/admin/device-types/{id}/deny/` | Deny type | ✅ | Admin |
| `GET` | `/notifications/` | List notifications | ✅ | Any |
| `GET` | `/notifications/unread-count/` | Get unread count | ✅ | Any |
| `GET` | `/notifications/{id}/` | Get notification | ✅ | Any |
| `DELETE` | `/notifications/{id}/` | Delete notification | ✅ | Any |
| `POST` | `/notifications/{id}/read/` | Mark as read | ✅ | Any |
| `POST` | `/notifications/read-all/` | Mark all as read | ✅ | Any |
| `DELETE` | `/notifications/bulk-delete/` | Bulk delete | ✅ | Any |
| `POST` | `/admin/notifications/create/` | Create notification | ✅ | Admin |
| `POST` | `/admin/notifications/broadcast/` | Broadcast to users | ✅ | Admin |
| `GET` | `/topology/` | Get network map | ✅ | Any |

---

## Notes for Frontend Developers

1. **First User Setup:** The first registered user becomes the `owner` with full privileges. Design an onboarding flow accordingly.

2. **Token Management:** Access tokens expire quickly. Implement automatic refresh using the refresh token.

3. **Device Controls:** Use `card_template.controls` to dynamically render UI widgets. The `variable_mapping` corresponds to keys in `current_state`.

4. **Real-time Updates:** Currently HTTP-based. For real-time, poll `/notifications/unread-count/` every 30 seconds for notification badges, or await future WebSocket implementation.

5. **Notifications:** Use `/notifications/unread-count/` for badge counts. The `by_type` field allows showing different badges for different notification categories.

6. **Icons:** Device icons use FontAwesome class names (e.g., `fa-lightbulb`). Include FontAwesome in your frontend.

7. **Accent Color:** Users can personalize their UI with `accent_color`. Use it for theming.

8. **Device States:** When updating state via `PATCH /devices/{id}/state/`, only send changed keys. They merge with existing state.
