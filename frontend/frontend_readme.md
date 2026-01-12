# HomeForge Frontend Documentation

## 1. Project Overview
**HomeForge** (formerly OpenDash) is a modern smart home management dashboard built with Next.js. It provides a visual interface for managing smart home devices, designing device topologies, and configuring user settings.

## 2. Technology Stack

### Core Frameworks
*   **Next.js 16**: App Router architecture for routing and server-side rendering.
*   **React 19**: UI library.
*   **TypeScript**: Static typing for improved developer experience and code safety.

### UI & Styling
*   **Tailwind CSS 4**: Utility-first CSS framework.
*   **Shadcn UI**: Reusable component library built on Radix UI primitives.
*   **Lucide React**: Icon set.
*   **Next Themes**: Dark/Light mode support.
*   **Framer Motion**: Animation library.

### Visualization & Interaction
*   **React Flow (@xyflow/react)**: Interactive node-based graph for the Device Builder and Topology views.
*   **Elkjs**: Automatic graph layout engine for the Topology view.
*   **@dnd-kit**: Drag-and-drop utilities (supplementing React Flow).

### State & Utilities
*   **Sonner**: Toast notifications.
*   **Zustand / Context API**: State management (UserProvider, Sidebar state).
*   **Axios / Fetch**: API communication (via `lib/apiClient.js`).

## 3. Key Features & Modules

### A. Authentication (`/app/login`, `/app/register`)
*   **Login**: JWT-based authentication. Stores tokens in `localStorage`.
*   **Register**: User sign-up with client-side password complexity validation (Min 4 chars, 1 Uppercase).
*   **Protection**: `fetchWithAuth` utility intercepts 401 responses to handle token refreshing or redirection.

### B. Dashboard Layout (`/app/dashboard`)
*   **AppSidebar**: Responsive sidebar with collapsible sections, user profile footer, and navigation.
*   **Theming**: Global accent color support (Blue default) that applies to buttons, hover states, and focus rings.

### C. Device Builder (`/app/dashboard/device-builder`)
*   **Purpose**: A drag-and-drop interface for designing custom smart devices (e.g., connecting sensors to an MCU).
*   **Key Capabilities**:
    *   **Canvas**: Infinite canvas with zoom/pan, constrained by `translateExtent`.
    *   **Drag & Drop**: Supports desktop (HTML5 DnD) and Mobile (Touch Events).
    *   **Mobile Support**: Custom `touchend` handler to calculate drop positions on touch devices.
    *   **Connection Logic**: Enforced directionality (Top Handle = Source/Output, Bottom Handle = Target/Input).
    *   **Validation**: Ensures only one MCU exists per device.
    *   **Visuals**: Glassmorphism node design (`CustomNode`), dynamic handle visibility.

### D. Topology View (`/app/dashboard/topology`)
*   **Purpose**: Visualizes the network of connected devices in the home.
*   **Features**:
    *   **Layout Strategy**: Custom "Star/Radial" topology algorithm. The Gateway is centered, with all devices connected in a radial pattern.
    *   **Visual Parity**: Matches the "Device Builder" aesthetic with identical glassmorphism nodes (`BuilderStyleNode`) and dark-themed canvas controls.
    *   **Status Indicators**: "Online" status is indicated by a glowing green dot (mirroring the Builder's selection state), while offline devices are appropriately styled.
    *   **Node Types**: Intelligent mapping of device names (e.g., "Camera", "Light") to specific icons and colors (Red/Video, Yellow/Sun) based on the Device Builder's design language.

### E. Settings (`/app/dashboard/settings`)
*   **Profile Management**: Update username, email, password, and avatar.
*   **Appearance**: Toggle Dark/Light mode and select custom accent colors.

## 4. Directory Structure
```
app/
├── app/                 # Next.js App Router pages
│   ├── dashboard/       # Protected routes
│   ├── login/           # Auth pages
│   └── globals.css      # Global styles & Tailwind theme
├── components/          # React components
│   ├── ui/              # Shadcn UI primitives
│   ├── topology/        # Graph specific components
│   └── ...              # Layout components (Sidebar, Nav)
├── hooks/               # Custom hooks (use-mobile, useTopologyLayout)
├── lib/                 # Utilities (API client, cn helper)
└── public/              # Static assets
```

## 5. Development Log

### Recent Changes (Dec 2025)

#### Mobile & Interaction Improvements
*   **Mobile Drag & Drop**: Fixed an issue where dragging nodes from the bottom sheet on mobile didn't work. Implemented a global `touchend` handler to calculate drop positions accurately.
*   **Canvas Constraints**: Limited the infinite canvas size using `translateExtent` to keep users focused on the workspace.
*   **Connection Logic**: Enforced strict "Top-to-Bottom" connection flow (Top=Source, Bottom=Target) and added auto-swap logic for intuitive connections.

#### Visual Polish & Theming
*   **Tag Removal**: Removed the "MCU" text label from Device Builder nodes and the "OFFLINE" badge from Topology nodes for a cleaner look.
*   **Global Accent Color**:
    *   Updated the global theme to use a consistent Blue accent (`oklch(0.55 0.2 260)`).
    *   Applied this accent color to **Sidebar hover states**, **Button hover states** (Ghost/Outline), and **Input focus rings**.
    *   Ensured consistent behavior across Light and Dark modes.

### Previous Improvements

#### 1. Application Renaming
*   **Action**: Renamed the application from "OpenDash" to "**HomeForge**".
*   **Files Modified**: `app/login/page.tsx`, `app/register/page.tsx`, `components/sidebar.tsx`, `components/app-sidebar.tsx`.

#### 2. Registration Improvements
*   **Action**: Added client-side password validation.
*   **Rule**: Password must contain at least 1 uppercase letter and be at least 4 characters long.
*   **File**: `app/register/page.tsx`.

#### 3. Settings Page Enhancements
*   **Action**: Expanded the profile settings form.
*   **New Features**: Added inputs for **Username**, **Email**, **New Password**. Integrated these fields into the `updateProfile` API call.
*   **File**: `app/dashboard/settings/page.tsx`.

#### 4. API Client Updates
*   **Action**: Updated `lib/apiClient.js` to handle the new fields (`username`, `email`, `password`) in the `updateProfile` function.

#### 5. User Experience & Theming
*   **Persistence**:
    *   Updated `UserProvider` to persist user data and accent color to `localStorage`.
    *   Implemented `useLayoutEffect` to apply the accent color immediately on page load.
    *   Updated `NavUser` to calculate initials dynamically.
*   **Visual Polish**:
    *   **Sidebar**: Replaced lightning icon with **Hammer** icon. Removed faded gradient background and drop shadows from logo.
    *   **Settings Page**: Centered form labels and added descriptive icons. Centered accent color picker.
    *   **User Menu**: Added accent-colored border to user avatar.

#### 6. Bug Fixes & Optimizations
*   **Avatar Updates**: Fixed avatar disappearance after update by implementing `refreshUser`.
*   **Performance**: Lazy-initialized `elkjs` in `useTopologyLayout`.
*   **React Flow**: Optimized `DeviceBuilder` configuration by memoizing `defaultEdgeOptions` and `proOptions`.

### 9. Admin Infrastructure (Phase 1)
*   **Admin Dashboard**: Created protected route `/dashboard/admin` for Admin/Owner roles.
*   **Navigation**: Updated `AppSidebar` to conditionally show "Admin Panel" navigation group.
*   **Room Management**: Added UI to list, create, edit, and delete rooms.
*   **User Management**: Added UI to list users and manage roles (Admin/User/Viewer).
*   **Device Type Approval**: Added UI to list device types and approve/reject pending definitions.

### 11. Visual & Feature Refinements (Phase 3)
*   **Topology Redesign**:
    *   **Goal**: Align the Topology view visually with the Device Builder.
    *   **Implementation**: Replaced `elkjs` with a custom radial layout engine. Ported `CustomNode` styles from Device Builder to a new `BuilderStyleNode` for the topology map.
    *   **Details**: Nodes now share the exact color palette (e.g., Temperature=Orange, Camera=Red), blur effects, and interactions (hover scales) as the builder.
*   **Device Management Enhancements**:
    *   **Custom Icons (UI)**: Replaced the raw text input with a user-friendly **Icon Picker**.
    *   **Implementation**: Utilizes `lucide-react` icons and a Shadcn `DropdownMenu` to provide a curated grid of smart home icons (Bulbs, Wifi, Sensors, etc.).
    *   **Data Handling**: Stores the icon name (e.g., "Lightbulb") in the backend. Front-end dynamically resolves this name to the correct Lucide React component for display.
    *   **Visuals**: Verified icon rendering in the Device List table, falling back to text if a custom string (non-Lucide) was provided previously.

### 10. User Capabilities (Phase 2)
*   **Device Registration Wizard**: 
    *   Created `/dashboard/devices/page.tsx` implementing a 3-step wizard (Type -> Room -> Details).
    *   Allows users to register actual devices into the system via the API.
*   **Device Type Proposal**:
    *   Created `/dashboard/device-types/page.tsx` with a JSON builder form.
    *   Enables users to propose new device capabilities (`definition`) which enter a "pending" state for admin review.
*   **Real Topology Data**:
    *   Refactored `/dashboard/topology/page.tsx` to fetch live data from `GET /topology/`.
    *   Updated visualization to support "Physical Topology" (Devices grouped by Rooms) using a grid-based auto-layout.
*   **Dashboard Integration**:
    *   Updated the main dashboard to display real-time counts of Registered Devices and Device Types.
*   **Component Additions**:
    *   Added `Select` (via `@radix-ui/react-select`) and `Textarea` components to `components/ui`.
