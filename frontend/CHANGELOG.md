# HomeForge Frontend Changelog

## [2026-02-02] - Notification System API Integration & UI Improvements

### Added

#### Real Notifications API Integration (`lib/apiClient.js`)
- **New API Functions**:
  - `fetchNotifications(params)` - GET /notifications/ with optional filters (is_read, notification_type, priority, page, page_size)
  - `fetchUnreadNotificationCount()` - GET /notifications/unread-count/
  - `fetchNotification(id)` - GET /notifications/{id}/
  - `markNotificationAsRead(id)` - POST /notifications/{id}/read/
  - `markAllNotificationsAsRead(params)` - POST /notifications/read-all/
  - `deleteNotification(id)` - DELETE /notifications/{id}/
  - `bulkDeleteNotifications(params)` - DELETE /notifications/bulk-delete/

### Changed

#### Notification Center Complete Rewrite (`components/notifications/notification-center.tsx`)
- **API Integration**: Replaced mock data with real backend API calls
- **New Notification Types Supported**:
  - `device_type_pending` (amber) - Device types awaiting approval
  - `device_type_approved` (green) - Device type approved
  - `device_type_denied` (red) - Device type denied
  - `device_offline` (red) - Device went offline
  - `device_online` (green) - Device came online
  - `device_error` (orange) - Device error
  - `system` (blue) - System notifications
  - `info` (blue) - Information messages
  - `warning` (orange) - Warning alerts
  - `error` (red) - Error alerts
- **Priority Support**: Displays priority badges (low, normal, high, urgent)
- **React Query Integration**:
  - Unread count polling every 30 seconds
  - Notifications fetched when popover opens
  - Automatic cache invalidation on mutations
- **URL Transformation**: `getActionUrl()` function transforms backend URLs to frontend routes:
  - `/admin/device-types/22` → `/dashboard/admin/device-types?filter=pending`
  - Handles trailing slashes and various URL formats

#### User Navigation (`components/nav-user.tsx`)
- **Notification Bell Placement**: Added notification bell icon next to user avatar in sidebar footer
- **Layout**: Bell button appears to the left of the user dropdown menu
- **Badge**: Animated badge with unread count (shows 9+ for counts over 9)

#### Topology Canvas (`components/topology/TopologyCanvas.tsx`)
- **Background Color Fix**: Changed from Tailwind class `bg-background` to inline style `backgroundColor: 'hsl(var(--background))'`
- **ReactFlow Styling**: Added explicit background color style to ReactFlow component
- **Theme Compatibility**: Ensures proper background color in both light and dark themes

#### Sidebar Navigation Fixes (`components/nav-main.tsx`)
- **Client-side Navigation**: Changed all `<a href={...}>` to Next.js `<Link href={...}>`
- **No Page Reloads**: Navigation now uses client-side routing

#### Breadcrumbs Navigation (`components/dynamic-breadcrumbs.tsx`)
- **Client-side Navigation**: Uses `<BreadcrumbLink asChild><Link href={...}></BreadcrumbLink>` pattern
- **Consistent Navigation**: No full page reloads when clicking breadcrumbs

#### Device Types Page (`app/dashboard/admin/device-types/page.tsx`)
- **URL Filter Support**: Reads initial filter from URL query parameter
- **Deep Linking**: Navigating to `/dashboard/admin/device-types?filter=pending` auto-selects pending filter

### Removed

#### Sidebar (`components/app-sidebar.tsx`)
- **Badge Counts**: Removed pending count badge from Admin Panel and Device Types menu items
- **Polling**: Removed `fetchPendingDeviceTypes` polling effect (notifications handle this now)
- **Notification Header**: Removed NotificationCenter from sidebar header (moved to user section)

---

## [2026-02-02] - Notification Center System

### Added

#### Notification Center Component (`components/notifications/notification-center.tsx`)
- **Purpose**: Centralized notification system for admin and user alerts
- **Features**:
  - Bell icon with animated badge showing unread count
  - Popover with scrollable notification list
  - Mark as read (individual or all)
  - Dismiss notifications (individual or clear all)
  - Time-relative timestamps using `date-fns`
  - Link to relevant pages from notifications
  - Different notification types with icons:
    - `approval_pending` (amber) - Device types awaiting approval
    - `system` (blue) - System notifications
    - `info` (blue) - Information messages
    - `warning` (orange) - Warning alerts
    - `success` (green) - Success confirmations

- **Admin Notifications**:
  - Shows pending device type approvals with count
  - Links directly to Device Types page with pending filter
  - Auto-refreshes every 30 seconds

- **UI Components Used**:
  - `Popover` - Notification dropdown
  - `ScrollArea` - Scrollable notification list
  - `Badge` - Count indicators
  - `Button` - Actions

### Changed

#### Admin Panel (`app/dashboard/admin/page.tsx`)
- Removed "Pending Approvals" card (functionality consolidated into Device Types page)
- Updated Device Types card description to reflect new unified functionality

#### Sidebar (`components/app-sidebar.tsx`)
- Added NotificationCenter component to sidebar header
- Notification bell appears below the logo with badge for unread notifications

### Backend Requirements
The notification system currently uses the existing `fetchPendingDeviceTypes` API. For a more robust notification system, consider adding:

1. **Notifications API endpoint** (`/api/notifications/`):
   - `GET /api/notifications/` - List user notifications
   - `POST /api/notifications/{id}/read/` - Mark as read
   - `DELETE /api/notifications/{id}/` - Dismiss notification
   - `POST /api/notifications/read-all/` - Mark all as read

2. **Notification model fields**:
   - `id`, `user`, `type`, `title`, `message`
   - `link`, `link_text`
   - `read`, `created_at`
   - `metadata` (JSON for extra data like count)

3. **WebSocket support** (optional):
   - Real-time notification push
   - Currently using polling (30s interval)

---

## [2026-02-02] - Custom Scrollbars and Mobile Device Type Selector

### Changed

#### Global Custom Scrollbars (`app/globals.css`)
- **Description**: Replaced default browser scrollbars with custom styled scrollbars matching shadcn/ui aesthetic
- **Features**:
  - Thin scrollbars using `scrollbar-width: thin` for Firefox
  - Custom webkit scrollbar styling for Chrome/Safari/Edge
  - Semi-transparent thumb that darkens on hover
  - Uses `--muted-foreground` CSS variable for theme consistency
  - Works in both light and dark modes

#### Enhanced ScrollArea Component (`components/ui/scroll-area.tsx`)
- **Description**: Improved the shadcn ScrollArea component for better visibility and proper scrolling
- **Changes**:
  - Added `overflow-hidden` to Root for proper height containment
  - Simplified Viewport class for better scrolling behavior
  - Added `[&>div]:!block` to fix Radix internal div display issues
  - Updated ScrollBar thumb styling to use `bg-muted-foreground/30` with hover state `bg-muted-foreground/50`
  - Added smooth transition on hover

#### Mobile Device Type Selector (`app/dashboard/admin/device-types/page.tsx`)
- **Description**: Added dropdown selector for device types on mobile instead of horizontal scroll list
- **Changes**:
  - Uses `useIsMobile` hook to detect mobile viewport
  - Mobile: Shows `Select` dropdown with device type name and status badge
  - Desktop: Shows scrollable list with `ScrollArea` component and proper height constraints
  - Added `overflow-hidden` to desktop container for proper ScrollArea height calculation
  - Maintains all functionality (bulk select for denied types) on both views
  - Dropdown shows component count for quick reference

### Added
- Import `useIsMobile` hook from `@/hooks/use-mobile`
- Import `ScrollArea` component from `@/components/ui/scroll-area`
- Conditional rendering based on viewport size

---

## [2026-02-02] - Unified Device Types Management Page

### Overview
Consolidated the three separate device type management pages (Device Types, Approvals, Denied Types) into a single unified page with a status filter dropdown. This provides a streamlined admin experience with all device type management in one place.

---

### Added

#### Unified Device Types Page (`app/dashboard/admin/device-types/page.tsx`)
- **Purpose**: Single page to manage all device types regardless of status
- **Features**:
  - **Status Filter Dropdown**: Filter between All, Approved, Pending, and Denied types with count badges
  - **Preview Panels**: Hardware topology (ReactFlow) and card UI preview for ALL status types (not just pending)
  - **Inline Name Editing**: For pending types, admins can edit the device name before approving without going to the full editor
  - **Direct Approval**: Approve pending types directly from preview without needing the editor
  - **Bulk Operations**: Select and delete multiple denied types at once
  - **Status-specific Actions**:
    - Pending: Approve (with optional name change), Deny (with reason)
    - Approved: Edit Structure (opens Device Builder), Delete
    - Denied: Delete, Bulk Delete
  - **Rejection Reason Display**: Shows full rejection reason for denied types
  - **Auto-select**: Automatically selects first item when switching filters

- **UI Components Used**:
  - `Select` - Status filter dropdown
  - `Badge` - Status indicators and count badges
  - `Checkbox` - Multi-select for denied types
  - `Dialog` - Confirmation modals for deny/delete
  - `Input` - Inline name editing
  - `ReactFlow` - Hardware topology visualization
  - `SmartDeviceCard` - Card UI preview

- **Data Fetching**:
  - Fetches from three endpoints: `deviceTypes`, `pendingDeviceTypes`, `deniedDeviceTypes`
  - Combines data with `_status` field for filtering
  - React Query with `staleTime: 30000`, `gcTime: 5 * 60 * 1000`

### Changed

#### Sidebar Navigation (`components/app-sidebar.tsx`)
- **Removed**: Separate "Approvals" and "Denied Types" menu items
- **Updated**: "Device Types" now shows pending count badge
- **Simplified**: Only fetches pending count (denied count no longer needed in sidebar)
- **New Admin Menu Structure**:
  - Rooms
  - Users
  - Device Types (with pending badge)
  - Debug

### Removed

#### Deleted Pages
- `app/dashboard/admin/approvals/page.tsx` - Functionality merged into Device Types
- `app/dashboard/admin/denied-types/page.tsx` - Functionality merged into Device Types

### Technical Details

#### State Management
```typescript
// Filter state
const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
type StatusFilter = 'all' | 'approved' | 'pending' | 'denied';

// Combine all types with status marker
const allTypes = useMemo(() => {
  const combined = [
    ...approvedTypes.map(dt => ({ ...dt, _status: 'approved' })),
    ...pendingTypes.map(dt => ({ ...dt, _status: 'pending' })),
    ...deniedTypes.map(dt => ({ ...dt, _status: 'denied' })),
  ];
  if (statusFilter === 'all') return combined;
  return combined.filter(dt => dt._status === statusFilter);
}, [approvedTypes, pendingTypes, deniedTypes, statusFilter]);
```

#### Name Change on Approval
```typescript
const approveMutation = useMutation({
  mutationFn: async ({ id, newName }) => {
    // If name changed, update it first
    if (newName && newName !== selectedType?.name) {
      await updateAdminDeviceType(id, { name: newName }, true);
    }
    return approveDeviceType(id);
  },
  // ... cache invalidation
});
```

### User Experience Improvements
1. **Single destination**: All device type management in one place
2. **Consistent preview**: All types (including approved) now show hardware topology and card preview
3. **Faster approval workflow**: Can approve pending types directly without opening editor
4. **Name correction**: Fix device names before approval without full edit
5. **Cleaner navigation**: Fewer sidebar items, more intuitive structure
6. **Responsive design**: Works on mobile with horizontal scroll for type list

---

## [2026-02-02] - Denied Device Types Management (SUPERSEDED)

### Overview
Implemented full management for denied device type proposals. Admins can now view, review, and clean up rejected device types with single or bulk deletion options.

---

### Added

#### New Page: Denied Device Types (`app/dashboard/admin/denied-types/page.tsx`)
- **Purpose**: Manage rejected device type proposals
- **Features**:
  - List all denied device types with rejection reasons displayed
  - Checkbox-based selection for bulk operations
  - Single delete, delete selected, and delete all options
  - Preview panel showing hardware topology (ReactFlow) and card UI preview
  - Real-time count badge in sidebar navigation
- **UI Components**: Uses shadcn/ui Checkbox, Dialog, Badge, Button components
- **Data Fetching**: React Query with `deniedDeviceTypes` query key

#### API Functions (`lib/apiClient.js`)
- `fetchDeniedDeviceTypes()` - GET `/admin/device-types/denied/`
- `deleteDeniedDeviceType(id)` - DELETE `/admin/device-types/denied/{id}/`
- `bulkDeleteDeniedDeviceTypes(ids)` - DELETE `/admin/device-types/denied/delete/`
  - Pass `null` or omit `ids` to delete all
  - Pass array of IDs to delete selected

#### UI Component: Checkbox (`components/ui/checkbox.tsx`)
- Added shadcn/ui checkbox component for selection functionality

### Changed

#### Sidebar Navigation (`components/app-sidebar.tsx`)
- **Added**: "Denied Types" item in Admin Panel submenu
- **Added**: Denied count badge on the menu item
- **Changed**: Fetches both pending and denied counts simultaneously
- **Icon**: Uses `XCircle` from lucide-react

#### Admin Approvals Page (`app/dashboard/admin/approvals/page.tsx`)
- **Added**: Link button to "Denied Types" page in header
- **Added**: Badge showing denied types count on the link
- **Added**: `deniedDeviceTypesCount` query for the badge
- **Changed**: Deny mutation now invalidates `deniedDeviceTypes` and `deniedDeviceTypesCount` caches
- **Improved**: Toast message now explains that denied types move to the denied list

---

## [2026-02-02] - Performance Optimization: React Query Migration

### Overview
Migrated all pages from `useEffect` + `useState` pattern to React Query (`@tanstack/react-query`) for improved performance, caching, and user experience.

---

### Changed

#### Devices List Page (`app/dashboard/devices/page.tsx`)
- **Migrated**: From `useEffect` + manual loading to `useQuery` hooks
- **Added**: `staleTime: 30000` - data considered fresh for 30 seconds
- **Added**: `gcTime: 5 * 60 * 1000` - cached for 5 minutes
- **Added**: Skeleton table rows during loading (5 rows with animated placeholders)
- **Added**: `useMemo` for filtered devices to prevent re-computation
- **Added**: `useCallback` for type name getter and refresh handler
- **Changed**: Uses `useQueryClient` for cache invalidation instead of manual refetch
- **Impact**: Faster page loads, no flash of loading state on navigation, cached data across views

#### Admin Users Page (`app/dashboard/admin/users/page.tsx`)
- **Migrated**: To `useQuery` + `useMutation` pattern
- **Added**: Skeleton table rows during loading (4 rows)
- **Added**: `roleChangeMutation` with optimistic updates
- **Added**: `deleteMutation` for user deletion
- **Changed**: Uses `useCallback` for handlers
- **Impact**: Better loading UX, automatic cache invalidation on mutations

#### Admin Rooms Page (`app/dashboard/admin/rooms/page.tsx`)
- **Migrated**: To `useQuery` + `useMutation` pattern
- **Added**: Skeleton table rows during loading (3 rows)
- **Added**: `createMutation`, `updateMutation`, `deleteMutation`
- **Changed**: Uses `useCallback` for handlers
- **Impact**: Better loading UX, automatic cache invalidation on mutations

#### Admin Device Types Page (`app/dashboard/admin/device-types/page.tsx`)
- **Migrated**: To `useQuery` + `useMutation` pattern
- **Added**: Skeleton table rows during loading (3 rows)
- **Added**: `deleteMutation` with cache invalidation
- **Changed**: Uses `useCallback` for delete confirmation
- **Impact**: Better loading UX, consistent data across pages

#### Admin Approvals Page (`app/dashboard/admin/approvals/page.tsx`)
- **Migrated**: To `useQuery` + `useMutation` pattern
- **Added**: `denyMutation` and `approveMutation`
- **Added**: Cache invalidation for `pendingDeviceTypes`, `pendingCount`, and `deviceTypes`
- **Changed**: Uses `useCallback` for selection and action handlers
- **Impact**: Sidebar badge updates automatically after approve/deny

---

### Performance Improvements

| Before | After | Benefit |
|--------|-------|---------|
| `useEffect` + `useState` | `useQuery` | Automatic caching, request deduplication |
| Manual `loadData()` calls | `queryClient.invalidateQueries()` | Smarter cache invalidation |
| Spinner in table | Skeleton rows | Better perceived performance |
| No caching | 30s staleTime, 5min gcTime | Faster navigation between pages |
| Inline functions | `useCallback` wrappers | Stable references, fewer re-renders |
| `filter()` on every render | `useMemo` | Cached computed values |

---

### React Query Configuration

All queries now follow consistent patterns:
- `staleTime: 30000` - Consider data fresh for 30 seconds
- `gcTime: 5 * 60 * 1000` - Keep in garbage-collected cache for 5 minutes
- Mutations invalidate related query keys on success
- Error handling via `onError` callbacks with toast notifications

---

## [2026-02-01] - UX Polish & Bug Fixes

### Fixed

#### Device Cards Text Selection (`components/devices/SmartDeviceCard.tsx`)
- **Added**: `select-none` class to Card component
- **Impact**: Text in device cards no longer gets accidentally selected when clicking or dragging over them

#### Sidebar Dropdown Animation (`app/globals.css`)
- **Changed**: Collapsible animations now include opacity fade (0 → 1)
- **Added**: `will-change: height, opacity` for GPU-accelerated animation
- **Added**: `forwards` fill mode to prevent animation jitter
- **Changed**: Close animation uses faster 0.15s timing with `ease-in`
- **Impact**: Admin Panel dropdown now opens/closes smoothly without jittering

#### Breadcrumb Mobile Visibility (`components/dynamic-breadcrumbs.tsx`)
- **Changed**: Separator now shows on mobile when navigating to sub-pages
- **Changed**: Logic uses `isFirst` flag to determine separator visibility
- **Changed**: Only the current (last) breadcrumb item shows on mobile, with separator
- **Impact**: Users can see "/ Settings" or "/ Admin" on mobile instead of just the page name

---

## [2026-02-01] - Mobile Responsiveness & Layout Consistency Update

### Overview
Comprehensive audit and update of all pages to ensure mobile-friendly layouts, consistent button alignment, and linear design principles across the entire application.

---

### Changed

#### Dashboard Main Page (`app/dashboard/page.tsx`)
- **Fixed**: Removed duplicate `"use client"` directive
- **Impact**: Cleaner code, no functional change

#### Devices Page (`app/dashboard/devices/page.tsx`)
- **Changed**: Padding from `p-6` to `p-4 md:p-6` for mobile
- **Changed**: Header layout uses `sm:flex-row` breakpoint for earlier horizontal layout
- **Changed**: Description text uses `text-sm` for consistency
- **Changed**: Button container uses `w-full sm:w-auto` for full-width on mobile
- **Added**: `overflow-x-auto` and `min-w-[600px]` to table for horizontal scroll on mobile
- **Impact**: Devices table now scrolls horizontally on small screens instead of breaking layout

#### Admin Console Page (`app/dashboard/admin/page.tsx`)
- **Added**: Padding wrapper `p-4 md:p-6`
- **Changed**: Title from `text-3xl` to `text-2xl md:text-3xl` for mobile
- **Changed**: Description uses `text-sm` for consistency
- **Changed**: Grid from `md:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-3` for better tablet support
- **Changed**: Card padding reduced with `pb-2` and `pt-0` for tighter layout
- **Changed**: Icon size from `w-6 h-6` to `w-5 h-5` for better proportions
- **Changed**: Card title from default to `text-base` for consistency
- **Changed**: System status uses `flex-col sm:flex-row` for mobile stacking
- **Impact**: Admin cards now display 1 column on phone, 2 on tablet, 3 on desktop

#### Admin Device Types Page (`app/dashboard/admin/device-types/page.tsx`)
- **Added**: Padding wrapper `p-4 md:p-6`
- **Changed**: Header uses `sm:flex-row` for mobile layout
- **Changed**: Description uses `text-sm` for consistency
- **Changed**: Button uses `w-full sm:w-auto` for full-width on mobile
- **Added**: `overflow-x-auto` and `min-w-[500px]` to table
- **Impact**: Table scrolls horizontally on mobile, button is full-width on phones

#### Admin Rooms Page (`app/dashboard/admin/rooms/page.tsx`)
- **Added**: Padding wrapper `p-4 md:p-6`
- **Changed**: Header uses `sm:flex-row` for mobile layout
- **Changed**: Description uses `text-sm` for consistency
- **Changed**: Button uses `w-full sm:w-auto` for full-width on mobile
- **Added**: `overflow-x-auto` and `min-w-[300px]` to table
- **Impact**: Consistent with other admin pages

#### Admin Users Page (`app/dashboard/admin/users/page.tsx`)
- **Added**: Padding wrapper `p-4 md:p-6`
- **Changed**: Header uses `sm:flex-row` for mobile layout
- **Changed**: Description uses `text-sm` for consistency
- **Added**: `overflow-x-auto` and `min-w-[600px]` to table
- **Impact**: User table scrolls horizontally on mobile

#### Admin Approvals Page (`app/dashboard/admin/approvals/page.tsx`)
- **Changed**: Padding from `p-1` to `p-4 md:p-6` for proper spacing
- **Changed**: Main layout from fixed `flex` to `flex-col lg:flex-row` for mobile stacking
- **Changed**: Left panel uses `w-full lg:w-64` for full-width on mobile
- **Added**: Horizontal scroll container for pending items on mobile with `overflow-x-auto`
- **Changed**: Pending items use `min-w-[200px]` and horizontal layout on mobile
- **Changed**: Right panel border uses `lg:border-l lg:pl-4` (only on large screens)
- **Changed**: Action buttons header uses `flex-col sm:flex-row` for mobile stacking
- **Changed**: Approve/Deny buttons use `flex-1 sm:flex-none` for equal width on mobile
- **Impact**: Approvals page now fully usable on mobile devices

#### Login Page (`app/login/page.tsx`)
- **Added**: `px-4` padding to form container for mobile edge spacing
- **Impact**: Form no longer touches screen edges on mobile

#### Register Page (`app/register/page.tsx`)
- **Added**: `px-4` padding to form container for mobile edge spacing
- **Impact**: Form no longer touches screen edges on mobile

#### Device Types Proposal Page (`app/dashboard/device-types/page.tsx`)
- **Changed**: Padding from `p-6` to `p-4 md:p-6` for mobile
- **Impact**: Better spacing on mobile devices

---

### Design Principles Applied

1. **Consistent Padding**: All pages now use `p-4 md:p-6` pattern
2. **Responsive Headers**: All page headers use `flex-col sm:flex-row` or `flex-col lg:flex-row`
3. **Full-Width Buttons on Mobile**: Action buttons use `w-full sm:w-auto`
4. **Horizontal Table Scroll**: All tables have `overflow-x-auto` with `min-w-[Xpx]`
5. **Consistent Description Text**: All descriptions use `text-sm text-muted-foreground`
6. **Responsive Grid Breakpoints**: Grids use progressive breakpoints (sm → md → lg → xl)

---

### Breakpoint Reference

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | 0-639px | Mobile - single column, stacked layouts |
| `sm` | 640px+ | Large phones - 2 columns, horizontal buttons |
| `md` | 768px+ | Tablets - increased padding |
| `lg` | 1024px+ | Desktop - full layouts, sidebars |
| `xl` | 1280px+ | Large desktop - expanded grids |

---

## [2026-02-01] - Approvals Page Improvements

### Changed
- **File**: `app/dashboard/admin/approvals/page.tsx`
- **Description**: Fixed topology map background and UI preview background from gray to `bg-background`
- **Description**: Added `key={selectedType?.id}` to ReactFlowProvider to force re-center on selection change
- **Impact**: Map properly re-centers when selecting different approvals

---

## [2026-02-01] - Admin Page Navigation Card Added

### Added
- **File**: `app/dashboard/admin/page.tsx`
- **Description**: Added "Pending Approvals" card to admin console
- **Position**: After "Device Types", before "Device Debug"
- **Icon**: CheckCircle (amber color)
- **Link**: `/dashboard/admin/approvals`

---

## [2026-02-01] - Sidebar Notification Polling

### Changed
- **File**: `components/app-sidebar.tsx`
- **Description**: Reduced pending approvals polling interval from 60s to 15s
- **Impact**: Badge updates more quickly when new device types are submitted

---

## [2026-02-01] - Topology Controls & Node Colors

### Changed
- **File**: `components/topology/TopologyCanvas.tsx`
- **Description**: Fixed Controls styling for @xyflow/react v12+ with `[&_svg]:!fill-muted-foreground`
- **Impact**: Control buttons now properly themed in dark/light mode

### Changed
- **File**: `components/topology/nodes/TopologyBuilderNode.tsx`
- **Description**: Removed name-based coloring from `resolveType` function
- **Description**: Nodes now colored only by `device_type`, not by name patterns
- **Impact**: Consistent node colors based on type, not arbitrary name matching

---

## [2026-02-01] - Drag and Drop Widget Ordering

### Added
- **File**: `app/dashboard/device-builder/DeviceUICreator.tsx`
- **Description**: Implemented drag and drop reordering using @dnd-kit
- **Components Added**: `SortableSquareWidget`, `SortableRowWidget`
- **Features**:
  - Touch-friendly with 200ms delay for mobile
  - GripVertical drag handle (visible on hover)
  - Smooth CSS transform animations
  - Separate contexts for square and row widgets
- **Impact**: Users can now drag widgets to reorder instead of using arrow buttons
