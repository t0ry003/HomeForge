# HomeForge API Documentation

This document outlines the API endpoints available for the HomeForge application.

## Base URL
`http://localhost:8000/api/`

## Authentication
The API uses JWT (JSON Web Tokens). You must obtain a token pair (access/refresh) and include the access token in the `Authorization` header of subsequent requests.

**Header Format:**
`Authorization: Bearer <your_access_token>`

---

## Endpoints

### 1. Registration
**POST** `/register/`

Creates a new user account.

**Payload (JSON):**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123",  // Must have 1 Uppercase, min 4 chars
  "first_name": "John",
  "last_name": "Doe",
  "role": "user"              // Optional: 'owner', 'admin', 'user', 'viewer'
}
```

> **Note:** The **first user** registered in the system is automatically assigned the `owner` role and granted **Superuser/Admin** privileges (access to Django Admin).

### 2. Login
**POST** `/login/`

Obtain JWT tokens.

**Payload (JSON):**
```json
{
  "username": "johndoe",
  "password": "Password123"
}
```

**Response:**
```json
{
  "refresh": "...",
  "access": "..."
}
```

### 3. Refresh Token
**POST** `/token/refresh/`

Get a new access token using a refresh token.

**Payload (JSON):**
```json
{
  "refresh": "..."
}
```

### 4. Get Current User Profile
**GET** `/me/`

Retrieve details of the currently logged-in user.

**Response:**
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "avatar": "http://localhost:8000/media/avatars/uuid-sequence.jpg",
    "role": "user",
    "accent_color": "#3B82F6"
  }
}
```

### 5. Update User Profile
**PUT** `/me/`

Update user details. Supports `multipart/form-data` for avatar uploads.

**Payload (Multipart/Form-Data):**
- `first_name`: (Text)
- `last_name`: (Text)
- `email`: (Text)
- `username`: (Text)
- `password`: (Text) - *Will reset password if provided*
- `avatar`: (File) - *Image file*
- `role`: (Text)
- `accent_color`: (Text) - *Hex color code (e.g., #3B82F6)*

**Example (JavaScript/FormData):**
```javascript
const formData = new FormData();
formData.append('first_name', 'Johnny');
formData.append('avatar', fileInput.files[0]);
formData.append('accent_color', '#FF5733');
formData.append('password', 'NewPass1'); // Optional

fetch('http://localhost:8000/api/me/', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
});
```

### 6. Get Network Topology
**GET** `/topology/`

Retrieves the network map of the smart home environment. This endpoint generates a node-based graph structure compatible with libraries like **React Flow**.

**Structure:**
- **Central Node**: A "HomeForge Gateway" node represents the server.
- **Device Nodes**: Each registered device is a node connected to the gateway.
- **Edges**: Connections representing the link between the gateway and devices.

**Response Schema:**
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
          "type": "server" 
      },
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "15",
      "type": "device",
      "data": { 
          "label": "Living Room Cam", 
          "ip": "192.168.1.105", 
          "status": "online", 
          "room": "Living Room", 
          "device_type": "Camera",
          "icon": "fa-video"
      },
      "position": { "x": 250, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge-homeforge-gateway-15",
      "source": "homeforge-gateway",
      "target": "15",
      "animated": true, 
      "style": { "stroke": "#10B981", "strokeWidth": 2 }
    }
  ]
}
```

### 7. Room Management (Authenticated)
**GET** `/rooms/` - List all rooms for the current user (owners see all).
**POST** `/rooms/` - Create a new room (Owner/Admin only).

**GET** `/rooms/<id>/` - Get details of a specific room.
**PUT** `/rooms/<id>/` - Update room details (Owner/Admin only).
**DELETE** `/rooms/<id>/` - Delete a room (Owner/Admin only).

### 8. User Management (Admin Only)
**GET** `/users/` - List all users.
**GET** `/users/<id>/` - Get details of a specific user.
**PUT** `/users/<id>/` - Update a user's details (admin override).

### 9. Device Type Management
**GET** `/device-types/` - List device types.  
- Admin sees all (including pending).
- Users see only `approved=True`.

**POST** `/device-types/propose/` - Propose a new device type (User).  
- Automatically sets `approved=False`.

**Payload (includes Schema Builder JSON):**
```json
{
  "name": "Super Sensor",
  "definition": {
      "name": "New Device",
      "structure": [
          { "id": "mcu-1", "type": "mcu", "label": "MCU", "position": { "x": 100, "y": 10 } },
          { "id": "temp-1", "type": "temperature", "label": "Temp", "position": { "x": 100, "y": 100 } }
      ]
  }
}
```

**POST** `/device-types/` - Create a new device type (Admin).
- `approved=True` by default for Admins.

**PUT** `/device-types/<id>/` - Update a device type (Admin only - e.g. Approve).
**DELETE** `/device-types/<id>/` - Delete a device type (Admin only).

### 10. Device Registration & Management
**POST** `/devices/` - Register a new device.

**Payload:**
```json
{
  "name": "Kitchen Light",
  "ip_address": "192.168.1.50",
  "device_type": 1,        // ID of an APPROVED device type
  "room": 2,               // ID of a Room (optional)
  "icon": "fa-lightbulb"   // FontAwesome icon class (optional, default: fa-cube)
}
```
**GET** `/devices/` - List user's devices.
**GET** `/devices/<id>/` - Get details of a device.
**PUT** `/devices/<id>/` - Update a device.
**DELETE** `/devices/<id>/` - Delete a device.



**POST** `/device-types/<id>/approve/` - Approve a device type (Admin only).

## Error Handling

The API returns concise but explicit error messages in a structured JSON format.

**Format:**
```json
{
  "field_name": ["Specific error message."],
  "non_field_errors": ["General error message."]
}
```

**Examples:**

1. **Validation Error (400)** - Duplicate Device Type Name:
   ```json
   {
     "name": ["A device type with this name already exists."]
   }
   ```

2. **Validation Error (400)** - Invalid Device Type Registration:
   ```json
   {
     "device_type": ["Device type must be approved."]
   }
   ```

3. **Permission Error (403)**:
   ```json
   {
     "detail": "Only Admins/Owners can perform this action."
   }
   ```
