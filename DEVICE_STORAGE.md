# Device Storage Implementation

This implementation adds comprehensive device management with dynamic schemas and room organization.

## Features

### 1. Device Types with Schemas
Define reusable device types with custom schemas that specify:
- **Sensors**: Data points the device can measure (e.g., temperature, humidity)
- **Actions**: Operations the device can perform (e.g., set_temp, toggle)

Example schema:
```json
{
  "sensors": ["temperature", "humidity"],
  "actions": ["set_temp", "set_mode"]
}
```

### 2. Room Organization
Organize your devices by physical location (e.g., Living Room, Kitchen, Bedroom).

### 3. Dynamic Device Management
Create devices with:
- Name and IP address
- Device type (from predefined types)
- Room assignment
- Custom data storage based on schema

## API Endpoints

### Rooms
- `GET /api/rooms/` - List all rooms
- `POST /api/rooms/` - Create a new room
- `PUT /api/rooms/{id}/` - Update a room
- `DELETE /api/rooms/{id}/` - Delete a room

### Device Types
- `GET /api/device-types/` - List all device types
- `POST /api/device-types/` - Create a new device type
- `PUT /api/device-types/{id}/` - Update a device type
- `DELETE /api/device-types/{id}/` - Delete a device type

### Devices
- `GET /api/devices/` - List all devices (includes device_type_info and room_name)
- `POST /api/devices/` - Create a new device
- `PUT /api/devices/{id}/` - Update a device
- `DELETE /api/devices/{id}/` - Delete a device

## Usage Example

### 1. Create a Room
```bash
curl -X POST http://localhost:8000/api/rooms/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Living Room"}'
```

### 2. Create a Device Type
```bash
curl -X POST http://localhost:8000/api/device-types/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thermostat",
    "description": "Smart thermostat for temperature control",
    "schema": {
      "sensors": ["temperature", "humidity"],
      "actions": ["set_temp", "set_mode"]
    }
  }'
```

### 3. Create a Device
```bash
curl -X POST http://localhost:8000/api/devices/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Thermostat",
    "ip_address": "192.168.1.100",
    "device_type": 1,
    "room": 1,
    "custom_data": {"temperature": 72, "humidity": 45}
  }'
```

## Frontend Pages

### /dashboard/rooms
Manage rooms:
- View all rooms in a table
- Add new rooms with a dialog
- Edit existing rooms
- Delete rooms

### /dashboard/device-types
Manage device type schemas:
- View all device types with their sensors and actions
- Create new device types with custom schemas
- Edit schemas for existing types
- Delete device types

### /dashboard/devices
Device dashboard organized by room:
- View all devices grouped by room
- See device status (online/offline)
- Add new devices with type and room selection
- Edit device details
- Delete devices

## Migration Notes

The implementation includes a 3-step migration strategy that safely converts existing `device_type` string fields to ForeignKey relationships:

1. **Step 1** (0006_add_devicetype_model.py):
   - Creates DeviceType model
   - Adds custom_data field to Device
   - Renames device_type to device_type_old
   - Adds new device_type as nullable ForeignKey

2. **Step 2** (0007_migrate_device_types.py):
   - Creates DeviceType objects from existing device_type strings
   - Links devices to their corresponding DeviceType

3. **Step 3** (0008_finalize_device_type_migration.py):
   - Removes device_type_old field
   - Makes device_type non-nullable

This ensures zero-downtime migrations on production systems.

## Testing

Run the test suite with Docker:
```bash
docker compose -f docker-compose.yml up db -d
docker compose -f docker-compose.yml run backend python manage.py test
```

## Security

All endpoints require authentication via JWT tokens. Users can only access their own rooms, device types, and devices.
