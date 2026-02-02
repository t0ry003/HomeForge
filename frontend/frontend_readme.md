# HomeForge Frontend

> A modern smart home management platform built with Next.js, React, and TypeScript.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [Features](#features)
- [Component Library](#component-library)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Theming](#theming)
- [Getting Started](#getting-started)

---

## Overview

**HomeForge** is a smart home management dashboard that provides:

- 🏠 **Device Management** — Register and monitor smart home devices
- 🔧 **Device Builder** — Design custom device configurations via drag-and-drop
- 🌐 **Topology View** — Visualize your connected device network
- ⚙️ **Settings** — User profiles, themes, and preferences
- 🛡️ **Admin Panel** — Room management, user roles, and device approvals
- 📱 **Mobile Responsive** — Fully optimized for phones, tablets, and desktops

---

## Technology Stack

### Core

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16+ | App Router, SSR, file-based routing |
| React | 19 | UI library |
| TypeScript | 5+ | Static typing |

### UI & Styling

| Package | Purpose |
|---------|---------|
| Tailwind CSS 4 | Utility-first CSS |
| shadcn/ui | Component library (Radix UI) |
| Lucide React | Icons |
| next-themes | Dark/Light mode |
| Framer Motion | Animations |

### Visualization

| Package | Purpose |
|---------|---------|
| @xyflow/react | Node-based graph canvas |
| elkjs | Graph layout algorithms |
| @dnd-kit | Drag-and-drop |

### Data & State

| Package | Purpose |
|---------|---------|
| TanStack Query | Server state & caching |
| React Context | Global client state |
| Sonner | Toast notifications |

---

## Architecture

### Provider Hierarchy

```
RootLayout
└── ThemeProvider          # Dark/Light mode
    └── QueryProvider      # React Query client
        └── UserProvider   # Auth & user state
            └── {children}
            └── Toaster    # Global notifications
```

### Request Flow

```
Component → React Query → apiClient.js → Backend API (port 8000)
                              ↓
                     JWT Token Management
                     (localStorage: access/refresh)
```

---

## Project Structure

```
/app
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Global styles & CSS variables
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   └── dashboard/              # Protected routes
│       ├── layout.tsx          # Dashboard layout (sidebar + header)
│       ├── page.tsx            # Dashboard home
│       ├── devices/            # Device registration wizard
│       ├── device-builder/     # Visual device designer
│       ├── device-types/       # Device type proposals
│       ├── topology/           # Network visualization
│       ├── settings/           # User preferences
│       └── admin/              # Admin-only routes
│           ├── rooms/          # Room management
│           ├── users/          # User management
│           ├── device-types/   # Approval queue
│           └── debug/          # Device state testing
│
├── components/                 # Reusable components
│   ├── ui/                     # shadcn/ui primitives (24 components)
│   ├── devices/                # Device-related components
│   ├── topology/               # Graph visualization
│   ├── notifications/          # Notification system
│   │   └── notification-center.tsx
│   ├── app-sidebar.tsx         # Main navigation
│   ├── nav-user.tsx            # User menu + notifications
│   ├── query-provider.tsx      # React Query setup
│   ├── theme-provider.tsx      # Theme configuration
│   └── user-provider.tsx       # Auth context
│
├── hooks/                      # Custom React hooks
│   └── use-mobile.ts           # Mobile detection
│
├── lib/                        # Utilities
│   ├── apiClient.js            # API communication
│   ├── utils.ts                # Helper functions (cn)
│   └── icons.ts                # Icon mappings
│
└── public/                     # Static assets
```

---

## Core Systems

### Authentication

JWT-based authentication with automatic token refresh:

```
1. Login (POST /api/login/) → Receive access + refresh tokens
2. Store tokens in localStorage
3. fetchWithAuth() adds Bearer token to requests
4. On 401 → Attempt token refresh → Retry or redirect to /login
```

**Key Files:**
- `lib/apiClient.js` — `login()`, `logout()`, `fetchWithAuth()`
- `components/user-provider.tsx` — `useUser()` hook

### Protected Routes

Dashboard routes check authentication in `app/dashboard/layout.tsx`:

```typescript
useEffect(() => {
  fetchProfile()
    .then(() => setIsAuthorized(true))
    .catch(() => router.push('/login'))
}, [])
```

### Role-Based Access

| Role | Access |
|------|--------|
| `owner` | Full access + Admin Panel |
| `admin` | Full access + Admin Panel |
| `user` | Standard dashboard |
| `viewer` | Read-only |

### Notification System

Real-time notifications with backend API integration:

```
1. Bell icon in sidebar footer (next to user avatar)
2. Badge shows unread count (polls every 30 seconds)
3. Click to open popover with notification list
4. Mark as read, dismiss, or clear all
5. Click notification to navigate to relevant page
```

**Notification Types:**

| Type | Color | Description |
|------|-------|-------------|
| `device_type_pending` | Amber | Device type awaiting approval |
| `device_type_approved` | Green | Device type approved |
| `device_type_denied` | Red | Device type denied |
| `device_offline` | Red | Device went offline |
| `device_online` | Green | Device came online |
| `device_error` | Orange | Device error |
| `system` | Blue | System notification |
| `info` | Blue | Information message |
| `warning` | Orange | Warning alert |
| `error` | Red | Error alert |

**Priority Levels:** `low`, `normal`, `high`, `urgent`

---

## Features

### Device Builder (`/dashboard/device-builder`)

Interactive canvas for designing device configurations:

- **Drag & Drop Nodes** — Desktop and mobile touch support
- **Drag & Drop Widget Ordering** — Reorder widgets with touch-friendly drag handles
- **Node Connections** — Top handle = output, Bottom = input
- **Validation** — Single MCU per device
- **Glassmorphism UI** — Translucent, modern node design
- **Auto-Generate** — Automatically create UI widgets from topology sensors
- **Sensor Widgets** — Temperature, Humidity, Motion, Light, CO2 displays
- **Flexible Layouts** — Row, Square, or Compact widget styles with 1-2 column grids

### Smart Device Cards

Device cards support intelligent behavior:

- **Single Toggle Devices** — Tap the entire card to toggle on/off
- **Multi-Control Devices** — Individual toggles and sliders for each relay
- **Sensor Displays** — Read-only widgets for monitoring (no sliders for sensors)
- **Widget Types:**
  - `TOGGLE` — On/off switch for relays
  - `SLIDER` — Range control (brightness, speed, etc.)
  - `TEMPERATURE` — Color-coded temperature display
  - `HUMIDITY` — Humidity with progress bar
  - `MOTION` — Motion detection status with alerts
  - `LIGHT` — Light level (lux) or bright/dark indicator
  - `CO2` — Air quality with quality badges

### Topology View (`/dashboard/topology`)

Network visualization of connected devices:

- **Radial Layout** — Gateway-centered star topology
- **Live Data** — Fetched from `/topology/` endpoint
- **Status Indicators** — Online (green glow) / Offline

### Device Management (`/dashboard/devices`)

Three-step registration wizard:
1. Select Device Type
2. Choose Room
3. Configure Details

### Settings (`/dashboard/settings`)

- Profile (name, email, avatar, password)
- Theme (Dark/Light)
- Accent color picker

### Admin Panel (`/dashboard/admin`)

- **Rooms** — Create, edit, delete rooms
- **Users** — View users, manage roles
- **Device Types** — Manage device type definitions with URL filter support (`?filter=pending`)
- **Debug** — Test device states and UI behavior

### Notification Center

Accessible from the sidebar footer (bell icon next to user avatar):

- **Real-time Updates** — Polls unread count every 30 seconds
- **Popover UI** — Clean notification list with scroll area
- **Actions:**
  - Mark individual as read (click notification)
  - Mark all as read
  - Dismiss individual notifications
  - Clear all read notifications
- **Navigation** — Click to go to relevant page (e.g., device types approval)
- **Priority Badges** — High/urgent notifications highlighted
- **Time Display** — Relative timestamps from API (`time_ago`)

---

## Mobile Responsiveness

All pages follow consistent responsive patterns:

### Layout Patterns

| Pattern | Mobile | Tablet+ |
|---------|--------|--------|
| Page Padding | `p-4` | `p-6` |
| Headers | Stacked (column) | Inline (row) |
| Buttons | Full width | Auto width |
| Tables | Horizontal scroll | Full display |
| Grids | 1 column | 2-5 columns |

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | 0-639px | Mobile - single column, stacked layouts |
| `sm` | 640px+ | Large phones - 2 columns, horizontal buttons |
| `md` | 768px+ | Tablets - increased padding |
| `lg` | 1024px+ | Desktop - sidebars, full layouts |
| `xl` | 1280px+ | Large desktop - expanded grids |

---

## UX Improvements

### Interaction Polish

| Feature | Implementation | File |
|---------|---------------|------|
| **Non-selectable device cards** | `select-none` class prevents accidental text selection when clicking/dragging | `SmartDeviceCard.tsx` |
| **Smooth dropdown animations** | GPU-accelerated with `will-change`, opacity fade, `forwards` fill | `globals.css` |
| **Mobile breadcrumb visibility** | Shows separator + current page on mobile (e.g., "/ Settings") | `dynamic-breadcrumbs.tsx` |

### Animation Performance

The sidebar collapsible animations use optimized CSS:

```css
.collapsible-content[data-state="open"] {
  animation: collapsible-open 0.2s ease-out forwards;
  will-change: height, opacity;
}

.collapsible-content[data-state="closed"] {
  animation: collapsible-close 0.15s ease-in forwards;
  will-change: height, opacity;
}
```

Key optimizations:
- `will-change` promotes elements to GPU layer
- `forwards` fill mode prevents snap-back on completion
- Opacity fade (0 → 1) creates smoother visual transition
- Faster close animation (0.15s) feels more responsive

---

## Component Library

### shadcn/ui Components (`components/ui/`)

| Component | Description |
|-----------|-------------|
| `button` | Action buttons with variants |
| `card` | Content containers |
| `dialog` | Modal dialogs |
| `input` | Text inputs |
| `select` | Dropdowns |
| `switch` | Toggle controls |
| `slider` | Range inputs |
| `table` | Data tables |
| `tooltip` | Hover information |
| `popover` | Floating content |
| `command` | Command palette |
| `dropdown-menu` | Action menus |
| `sheet` | Slide-out panels |
| `skeleton` | Loading placeholders |

### Custom Components

| Component | Purpose |
|-----------|---------|
| `AppSidebar` | Main navigation sidebar |
| `NavUser` | User dropdown menu + notification bell |
| `NotificationCenter` | Bell icon with popover notification list |
| `SmartDeviceCard` | Device display card with smart toggle behavior |
| `SensorWidgets` | Temperature, Humidity, Motion, Light, CO2 displays |
| `IconPicker` | Icon selection UI |
| `TopologyCanvas` | React Flow wrapper |
| `TopologyBuilderNode` | Network device node (type-based coloring) |
| `BuilderStyleNode` | Glassmorphism graph node |
| `DeviceUICreator` | Widget builder with auto-generation |
| `SortableSquareWidget` | Draggable square widget (dnd-kit) |
| `SortableRowWidget` | Draggable row widget (dnd-kit) |

---

## State Management

### Server State (React Query)

Configured in `components/query-provider.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,            // Refetch after 5 seconds
      refetchOnWindowFocus: true, // Refresh on tab focus
    },
  },
})
```

**Usage:**
```typescript
// Queries
const { data, isLoading } = useQuery({
  queryKey: ['devices'],
  queryFn: () => apiClient.get('/devices/')
})

// Mutations
const mutation = useMutation({
  mutationFn: (data) => apiClient.post('/devices/', data),
  onSuccess: () => queryClient.invalidateQueries(['devices'])
})
```

### Client State (Context)

**UserContext** (`components/user-provider.tsx`):

```typescript
const { 
  user,              // Current user data
  isLoading,         // Loading state
  logout,            // Logout function
  updateAccentColor, // Theme customization
  refreshUser        // Refetch profile
} = useUser()
```

---

## API Integration

### API Client (`lib/apiClient.js`)

```javascript
import { fetchDevices, updateDevice, updateDeviceState, deleteDevice } from '@/lib/apiClient'

// Fetch all devices
const devices = await fetchDevices()

// Update device properties (status, name, etc.)
await updateDevice(deviceId, { status: 'online' })

// Update device state (current_state JSON)
await updateDeviceState(deviceId, { relay_1: true, brightness: 75 })

// Delete a device
await deleteDevice(deviceId)
```

### Notification API

```javascript
import { 
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  bulkDeleteNotifications
} from '@/lib/apiClient'

// Get notifications (with optional filters)
const { results, count } = await fetchNotifications({ is_read: false, page: 1 })

// Get unread count for badge
const { unread_count } = await fetchUnreadNotificationCount()

// Mark as read
await markNotificationAsRead(notificationId)
await markAllNotificationsAsRead({ notification_type: 'device_type_pending' })

// Delete notifications
await deleteNotification(notificationId)
await bulkDeleteNotifications({ is_read: true })  // Delete all read
```

### Backend URL

Auto-detected based on current hostname:

```javascript
// Browser: Uses current protocol + hostname:8000
// Server: Falls back to http://localhost:8000
```

### Error Handling

Django REST Framework errors are normalized:

```javascript
// Field errors → Joined message
// detail string → Thrown as-is
// non_field_errors → Combined message
```

---

## Theming

### Dark Mode

Managed by `next-themes`:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
/>
```

### Accent Colors

Customizable via `UserProvider`:

```typescript
const ACCENT_COLORS = {
  default: "oklch(0.205 0 0)",
  violet:  "oklch(0.5 0.2 280)",
  blue:    "oklch(0.5 0.2 250)",
  green:   "oklch(0.6 0.15 150)",
  orange:  "oklch(0.6 0.15 50)",
  pink:    "oklch(0.6 0.2 340)",
  cyan:    "oklch(0.6 0.15 200)",
}
```

Colors are applied via CSS custom properties (`--primary`, `--ring`).

---

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on port 8000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |

### Environment

The frontend auto-connects to the backend:
- **Dev:** `http://localhost:8000`
- **Prod:** Same hostname, port 8000

---

## Additional Resources

- [Changelog](CHANGELOG.md)
- [Backend API Documentation](backend_api.md)
- [Copilot Instructions](.github/copilot-instructions.md)
- [shadcn/ui](https://ui.shadcn.com)
- [React Flow](https://reactflow.dev)
- [TanStack Query](https://tanstack.com/query)
