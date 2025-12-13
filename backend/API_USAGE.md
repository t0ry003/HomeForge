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

Retrieves the network topology of the user's home. If no devices exist, it generates 10 mock devices connected to a virtual "Home Server".

**Behavior:**
- **Mock Data**: Automatically creates 10 devices if the user has none.
- **Status Simulation**: Randomly toggles device status (online/offline) on each request to simulate network activity.

**Response:**
```json
{
  "name": "Home Server",
  "ip": "192.168.1.1",
  "type": "server",
  "status": "online",
  "children": [
    {
      "id": 1,
      "name": "Device 1",
      "ip_address": "192.168.1.101",
      "status": "online",
      "device_type": "light",
      "room": 1,
      "room_name": "Living Room"
    },
    {
      "id": 2,
      "name": "Device 2",
      "ip_address": "192.168.1.102",
      "status": "offline",
      "device_type": "thermostat",
      "room": 1,
      "room_name": "Living Room"
    }
    // ... up to 10 devices
  ]
}
```
