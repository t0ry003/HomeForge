# HomeForge Frontend Changelog

## [2026-02-15] - Grid Alignment Fix for Variable-Height Cards

### Changed

#### Grid `items-start` Alignment (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Added `items-start` to the grid container to prevent shorter cards from stretching to match the tallest card in their row
- **Problem**: CSS grid's default `align-items: stretch` made every cell in a row the same height as the tallest card, causing the grip overlay and drop indicator lines to extend beyond the bottom of shorter cards
- **Fix**: `items-start` makes each grid cell wrap tightly to its content height, so all overlays (grip icon, drop lines, merge ring) match the actual card dimensions
- **Impact**: Drop lines and grip icons now correctly respect the visual boundaries of small single-toggle cards, medium cards, and tall multi-widget cards alike

---

## [2026-02-15] - Dynamic Grip Icon & Centered Drop Lines

### Changed

#### Dynamic Grip Icon (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Grip icon now scales dynamically with the card — uses `h-1/3` of the card height (clamped between `min-h-5` and `max-h-12`) with `aspect-square` to stay proportional on small, tall, and wide cards alike

#### Centered Drop Lines (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Moved the left/right reorder indicator lines from the card edge (`-3px`) to the center of the gap between cards (`-10px`), so the glowing line sits halfway between adjacent cards rather than hugging one side

---

## [2026-02-15] - 3-Zone Drop Targets for Device Grid

### Changed

#### 3-Zone Drop System (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Replaced the single-target drop behavior with a 3-zone system per card: drag to the **left edge** (25%) to insert before, to the **center** (50%) to merge into a folder, or to the **right edge** (25%) to insert after
- **Left/Right zones**: Display a glowing primary-colored vertical line on the corresponding edge of the target card, indicating where the item will be placed
- **Middle zone**: Shows an iOS-style pulsing scale-up ring when merge is possible (device→device or device→open folder), with the drag overlay shrinking toward the target
- **No auto-shifting**: Disabled `rectSortingStrategy` CSS transforms on non-dragged items — cards now stay in their original positions during drag instead of shifting around, eliminating the "goes left/right" glitch entirely
- **Pointer tracking**: Uses a `pointermove` listener with cached element lookups (`getBoundingClientRect`) to continuously compute which zone the cursor is in, with ref-based deduplication to minimize re-renders
- **Reorder logic**: Correctly computes the target splice index based on zone + relative position of source/target, handling all edge cases (adjacent items, first/last position, no-op drops)

#### Responsive Grip Icon (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Reduced the hover grip icon from `h-8 w-8` to `h-5 w-5` with lower opacity (40% instead of 60%) and subtler background tint, so it adapts better to cards of varying sizes
- **Hidden during drag**: The grip overlay is only shown when no drag is in progress, preventing visual clutter during active reordering

#### Drop Animation & Absorb Effect
- **Merge absorb**: On merge drop, the target card compresses (scale 95%, 60% opacity) for 300ms before the folder is created, providing smooth visual feedback
- **Drag overlay**: Shrinks to 75% scale when hovering over a merge-eligible center zone, stays full-size with shadow for left/right reorder zones

---

## [2026-02-15] - iOS-Style Drag & Merge for Device Grid

### Changed

#### Whole-Card Drag (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Removed the small corner drag-handle icon. In edit mode, the entire device card is now the drag surface — grab from anywhere on the card to drag it
- **Hover indicator**: A large centered `GripVertical` icon fades in over the card on hover (edit mode only), with a subtle background tint
- **Impact**: Much more intuitive — matches how iOS/Android home screen icon dragging works

#### iOS-Style Merge Animation (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Completely reworked the folder-merge interaction to eliminate the "left/right jump" glitch
- **Merge target**: Pulsing scale-up (110%) with a glowing primary-color ring and shadow — clearly shows "this card will absorb the dragged card"
- **Drag overlay**: Shrinks to 75% opacity/scale when hovering over a merge target, visually converging into the target (like iOS folder creation)
- **Absorb animation**: On drop, the target briefly compresses (scale 95% + fade) then the folder is created after a 300ms delay, preventing the jarring instant-swap
- **Dragged item hidden**: The source card is fully hidden (opacity 0) during drag instead of 40% ghost, so there's no confusing duplicate

---

## [2026-02-15] - Move Edit Layout into Grouping Dropdown

### Changed

#### Edit Layout Entry Point (`app/dashboard/page.tsx`)
- **Description**: Moved the "Edit Layout" action from a standalone always-visible button into the grouping dropdown, below a separator after "Sort by Name"
- **Behavior**: Selecting "Edit Layout" in the dropdown switches to "All Devices" view and enters edit mode simultaneously; switching to any other grouping mode auto-exits edit mode
- **Impact**: Cleaner toolbar — the edit button no longer takes up space when users don't need it

#### Toolbar Cleanup (`components/devices/DraggableDeviceGrid.tsx`)
- **Description**: Removed the standalone "Edit Layout / Done" toggle button. The "Done" button now only renders when already in edit mode. Removed unused `Pencil` import
- **Impact**: Edit-mode tools (Done, Reset Layout, Revert to Admin Default, Set as Default for All) still appear in the toolbar during editing

---

## [2026-02-15] - Fix React Query Cache Leak Between User Sessions

### Changed

#### Logout Cache Clearing (`components/nav-user.tsx`)
- **Description**: Added `queryClient.clear()` on logout so the next user doesn't see stale cached data (dashboard layout, devices, notifications, etc.)
- **Also clears**: `homeforge_dashboard_layout` localStorage key (offline layout cache)
- **Impact**: Switching accounts no longer requires a hard refresh to see the correct data

#### UserProvider Logout (`components/user-provider.tsx`)
- **Description**: Added `queryClient.clear()` inside `logout()` and aligned localStorage cleanup (now also removes `access`, `refresh`, `homeforge_dashboard_layout`)
- **Impact**: Any code path using `UserProvider.logout()` also clears the cache

#### Login Cache Reset (`app/login/page.tsx`)
- **Description**: Added `queryClient.clear()` and `localStorage.removeItem('homeforge_dashboard_layout')` before calling `login()`, ensuring stale data from a previous session is purged before fetching the new user's data
- **Impact**: Even if a user navigates directly to `/login` without logging out first, old cache is cleared

---

## [2026-02-15] - Persisted Device Order / Grouping Preference

### Added

#### Device Order API Integration (`lib/apiClient.js`)
- **`fetchDeviceOrder()`**: `GET /device-order/` — fetches the user's persisted grouping preference (cascade: personal → admin → default `"room"`)
- **`updateDeviceOrder(order)`**: `PATCH /device-order/` — persists the grouping preference without re-saving the layout
- **Updated `saveDashboardLayout(layout, deviceOrder)`**: Now optionally sends `device_order` alongside the layout on `PUT /dashboard-layout/`

#### Persisted Grouping in Hook (`hooks/useDashboardLayout.ts`)
- **`deviceOrder` state**: Initialized from `device_order` in the API layout response, defaults to `'custom'`
- **`setDeviceOrder(order)` function**: Updates local state immediately and fires `PATCH /device-order/` to persist
- **Exported `DeviceOrder` type**: `'room' | 'type' | 'status' | 'name' | 'custom'`

#### New Grouping Modes in Dashboard (`app/dashboard/page.tsx`)
- **"Group by Status"**: Groups devices into Online / Offline / Error sections
- **"Sort by Name"**: Alphabetical flat grid ordered by device name
- **Persisted selection**: The dropdown now reads from and writes to the API — when a user picks "Group by Room", that preference survives page refresh
- **`custom` ↔ `all` mapping**: `device_order: 'custom'` corresponds to the drag-and-drop grid ("All Devices"), other values show the grouped view

### Changed
- **Dashboard `viewMode`**: No longer a local `useState` — derived from `deviceOrder` returned by the layout hook, so the grouping choice is persisted per-user via the API
- **Removed unused `useState` import** from dashboard page

---

## [2026-02-15] - Fix Layout Persistence, Reset Options & Folder UI

### Fixed

#### Layout Persistence Bug (`hooks/useDashboardLayout.ts`)
- **Root cause**: `scheduleSave` depended on `useMutation` return which changed every render, preventing the debounce timer from ever firing and causing non-admin users' layouts to revert to the shared admin layout on refresh
- **Fix**: Replaced `useMutation` with a direct `saveDashboardLayout()` call inside the debounced callback, using a stable `useCallback` that only depends on `queryClient`
- **Removed `invalidateQueries`**: API save now uses `queryClient.setQueryData()` instead of re-fetching, preventing race conditions that overwrote local state
- **Flush on "Done"**: When the user exits edit mode, any pending debounced save is flushed immediately — the 800ms timer is cancelled and `saveDashboardLayout()` fires synchronously so the API write completes before a possible page refresh
- **Flush on unmount**: Cleanup effect now fires a `saveDashboardLayout()` (fire-and-forget) if a pending save exists when the component unmounts
- **Prevent spurious init save**: The init effect now stamps `prevDeviceIdsRef` with the current device IDs so the reconcile effect doesn't re-fire on the same render cycle, preventing an unnecessary layout save right after initialization
- **Set `staleTime: Infinity`** and `refetchOnMount: false` so the query never auto-refetches behind the user's back

### Added

#### Separate Reset & Revert Buttons
- **"Reset Layout" button**: Resets to a flat default layout (no folders) and saves it as the user's personal layout
- **"Revert to Admin Default" button**: Deletes the user's personal layout and fetches the admin's shared layout from `GET /api/admin/dashboard-layout/`
- **New `revertToShared()` function** in `useDashboardLayout` hook
- Wired through `DraggableDeviceGrid` → `dashboard/page.tsx` via new `onRevertToShared` prop

### Changed

#### Folder Preview Grid (`components/devices/DeviceFolder.tsx`)
- **Removed constraining wrapper**: Eliminated the `p-4 pb-2` wrapper div and `aspect-square max-h-28` that caused icons to be squeezed to the top-left
- **Grid fills card**: Preview grid now uses `grid grid-cols-2 gap-1.5 p-3 flex-1` directly, with `aspect-square` on each cell so tiles fill the card proportionally
- **Larger icons**: Bumped preview icons from `w-6 h-6` to `w-7 h-7`

#### Folder Expanded Popup (`components/devices/DeviceFolder.tsx`)
- **Redesigned overlay**: Narrower panel (`sm:max-w-lg`), bottom-sheet style on mobile with rounded top corners and drag indicator
- **Darker backdrop**: `bg-black/50 backdrop-blur-md` for better contrast
- **Compact header**: Icon in a rounded background pill, inline rename, smaller close button
- **2-column grid always**: Device cards in `grid-cols-2 gap-3` for a tidier layout
- **Smaller remove buttons**: Repositioned to top-right corner with `-top-1.5 -right-1.5` and smaller icon

---

## [2026-02-15] - Dashboard Layout API Integration & Admin Shared Layout

### Changed

#### Dashboard Layout Hook (`hooks/useDashboardLayout.ts`)
- **API-first persistence**: Rewrote hook to fetch layout from `GET /api/dashboard-layout/` via React Query on mount, replacing localStorage-only storage
- **Debounced API save**: Layout changes are debounced (800ms) before `PUT /api/dashboard-layout/`, with localStorage used as an immediate offline cache
- **Fallback chain**: API → localStorage → default layout, so the dashboard works even when the backend is unreachable
- **Reset via API**: `resetLayout()` now calls `DELETE /api/dashboard-layout/` to remove the user's personal layout, reverting to the shared/default
- **New `isSaving` return value**: Exposes `saveMutation.isPending` for UI feedback

#### DraggableDeviceGrid (`components/devices/DraggableDeviceGrid.tsx`)
- **New props**: `isAdmin`, `isSaving`, `onSetAsShared`
- **Saving indicator**: Shows a spinner with "Saving…" text in the toolbar when a save is in flight
- **"Set as Default for All" button**: Visible to admins in edit mode — pushes the current layout as the shared default via `PUT /api/admin/dashboard-layout/`

#### Dashboard Page (`app/dashboard/page.tsx`)
- **Admin detection**: Reads `user.profile.role` / `user.role` to determine admin status
- **Shared layout handler**: `handleSetAsShared` calls `saveSharedDashboardLayout()` with a success/error toast
- **Passes new props**: `isAdmin`, `isSaving`, `onSetAsShared` forwarded to `DraggableDeviceGrid`

### Added

#### API Client (`lib/apiClient.js`)
- **`fetchDashboardLayout()`**: `GET /api/dashboard-layout/` — fetches user's layout (falls back to shared)
- **`saveDashboardLayout(layout)`**: `PUT /api/dashboard-layout/` — saves user's personal layout
- **`deleteDashboardLayout()`**: `DELETE /api/dashboard-layout/` — removes personal layout
- **`fetchSharedDashboardLayout()`**: `GET /api/admin/dashboard-layout/` — fetches shared layout (admin)
- **`saveSharedDashboardLayout(layout)`**: `PUT /api/admin/dashboard-layout/` — saves shared layout (admin)

---

## [2026-02-15] - Dashboard Drag-and-Drop Grid with Folders

### Added

#### Dashboard Grid Data Model (`lib/dashboard-grid.ts`)
- **New file**: Data model and localStorage persistence layer for customisable dashboard layouts
- **Types**: `GridDeviceItem`, `GridFolderItem`, `GridItem`, `DashboardLayout` — supports standalone devices and folders containing 2–4 devices
- **Persistence helpers**: `loadLayout()`, `saveLayout()`, `clearLayout()` using localStorage key `homeforge_dashboard_layout`
- **Reconciliation**: `reconcileLayout()` handles device additions/removals without losing folder structure
- **Default builder**: `buildDefaultLayout()` creates a flat device list when no layout exists

#### Dashboard Layout Hook (`hooks/useDashboardLayout.ts`)
- **New file**: React hook managing grid layout state with auto-reconciliation on device list changes
- **CRUD operations**: `moveItem`, `createFolder`, `addToFolder`, `removeFromFolder`, `renameFolder`, `dissolveFolder`, `resetLayout`
- **Edit mode**: `editMode` / `setEditMode` toggle for drag-and-drop UI
- **Auto-save**: persists to localStorage on every state change

#### DeviceFolder Component (`components/devices/DeviceFolder.tsx`)
- **New file**: Apple/Google Home-style folder tile component
- **Collapsed view**: 2×2 icon preview grid with status indicator dots, folder name with device count badge
- **Expanded view**: Framer Motion overlay with spring animation, full `SmartDeviceCard` rendering in 1–2 column grid
- **Inline rename**: Double-click folder name to rename; input field in expanded header
- **Edit mode**: Wiggle animation with ungroup button
- **Remove from folder**: Per-card remove button inside expanded overlay

#### DraggableDeviceGrid Component (`components/devices/DraggableDeviceGrid.tsx`)
- **New file**: Main drag-and-drop grid powered by `@dnd-kit/core` + `@dnd-kit/sortable`
- **Drag-to-create folder**: Drag one device onto another device to auto-create a named folder
- **Drag-to-add**: Drag a device onto an existing folder (max 4 devices per folder)
- **Reorder**: Drag items to reposition in the grid
- **Edit toolbar**: "Edit Layout" / "Done" toggle button, "Reset Layout" button, hint bar with instructions
- **Drag overlay**: Ghost card follows cursor during drag with `DragOverlay`
- **Drop target highlight**: Blue ring on valid drop targets

#### Context Menu Component (`components/ui/context-menu.tsx`)
- **New shadcn/ui component**: Installed via `npx shadcn@latest add context-menu` for future right-click menus on grid items

#### Backend API Spec (`API_USAGE.md`)
- **New section 9**: Dashboard Layout API with 5 endpoints:
  - `GET /dashboard-layout/` — get user's layout (falls back to shared)
  - `PUT /dashboard-layout/` — save user's personal layout
  - `DELETE /dashboard-layout/` — reset to shared layout
  - `GET /admin/dashboard-layout/` — get shared layout (admin)
  - `PUT /admin/dashboard-layout/` — set shared layout (admin)
- **Data model**: TypeScript interfaces + suggested Django model
- **Validation**: device existence, uniqueness, folder size limits (2–4), max 100 items
- Updated Table of Contents, Quick Reference table, and section numbering

### Changed

#### Dashboard Page (`app/dashboard/page.tsx`)
- **Grid integration**: "All Devices" view now uses `DraggableDeviceGrid` with folder support instead of flat card grid
- **Layout hook**: Added `useDashboardLayout(deviceIds)` call with memoised device ID list
- **Fallback**: Room and Type group views retain legacy `SmartDeviceCard` grid with `animationIndex`

### Fixed (Pre-existing Type Errors)

#### User Provider (`components/user-provider.tsx`)
- **Root cause fix**: `createContext({user: null, ...})` inferred `null` literal type, causing `Property X on type 'never'` errors across the entire codebase. Added explicit generic type parameter `createContext<{user: any; setUser: ...; isLoading: ...}>()`

#### `getAvatarUrl()` (`lib/apiClient.js`)
- Changed return value from `null` to `undefined` when no path provided, making it compatible with DOM attributes that expect `string | undefined`

#### App Sidebar (`components/app-sidebar.tsx`)
- Added `?? ""` fallback for `getAvatarUrl()` result to satisfy `NavUser` prop type

#### Topology Components
- `components/topology/TopologyCanvas.tsx`: Added `Node`/`Edge` generic parameters to `useNodesState<Node>([])`/`useEdgesState<Edge>([])` to fix `never[]` inference
- `components/topology/nodes/BuilderStyleNode.tsx`: Cast `data` as `any` to avoid `unknown` property access errors
- `components/topology/nodes/TopologyBuilderNode.tsx`: Same `data as any` cast
- `components/topology/nodes/GlassDeviceNode.tsx`: Same `data as any` cast to fix `'opendash'` not in union comparison
- `components/topology/nodes/UnifiDeviceNode.tsx`: Same `data as any` cast (proactive)

#### useTopologyLayout (both copies)
- `app/hooks/useTopologyLayout.ts` & `hooks/useTopologyLayout.ts`: Fixed `ELK` type to `InstanceType<typeof ELK>`, added `Node`/`Edge` generics, typed `.map(e =>` as `(e: any) =>`

#### Other Pre-existing Fixes
- `app/dashboard/admin/approvals/page.tsx`: `t` → `(t: any)` in map callback
- `app/dashboard/admin/rooms/page.tsx`: `room` → `(room: any)` in map callback
- `app/dashboard/admin/users/page.tsx`: `getAvatarUrl()` result `?? undefined`
- `app/dashboard/device-builder/DeviceUICreator.tsx`: Cast `.unit` as `(... as any).unit`
- `app/dashboard/device-builder/page.tsx`: `variant="dots"` → `variant={"dots" as any}`
- `app/dashboard/layout.tsx`: Removed invalid `user` prop from `<AppSidebar />`
- `app/register/page.tsx`: Added missing `role: 'viewer'` to `registerUser()` call
- `app/dashboard/settings/page.tsx`: `getAvatarUrl(...)` → `getAvatarUrl(...) ?? null` for `setAvatarPreview`
- `components/devices/SmartDeviceCard.tsx`: `widgetVariant` cast as `'row' | 'square'`
- `components/ui/sonner.tsx`: Cast `toastOptions` as `any` to allow `onClick` property

---

## [2026-02-15] - Dynamic Skeleton Count & Jelly Entrance Animation

### Changed

#### Dashboard Page (`app/dashboard/page.tsx`)
- **Dynamic Skeleton Count**: Skeleton grid now uses the cached device count from the previous load, so the number of placeholder cards matches the real device count. On first-ever load, falls back to a responsive estimate based on viewport width (~2 rows worth of cards)
- **Module-Level `cachedDeviceCount`**: Upgraded from a boolean cache to also store the last-known device count for skeleton sizing
- **Jelly Entrance on Device Cards**: All three view modes (`all`, `room`, `type`) now pass an `animationIndex` to `SmartDeviceCard`, giving each card a staggered macOS-style jelly bounce-in on mount

#### SmartDeviceCard (`components/devices/SmartDeviceCard.tsx`)
- **New `animationIndex` Prop**: Optional prop that, when provided, applies a `jelly-in` animation with a 60ms stagger per card. Creates an elastic scale-bounce entrance every time the dashboard opens
- **Animation Composability**: The jelly animation coexists with existing hover/active transitions without conflict

#### DeviceCardSkeleton (`components/devices/DeviceCardSkeleton.tsx`)
- **Responsive Fallback**: New `useResponsiveSkeletonCount` hook estimates skeleton count based on viewport breakpoints (matching the grid's `sm:2 md:3 lg:4 xl:5` columns × 2 rows) when no cached count is available
- **Priority: Cached Count > Responsive Estimate**: Uses `cachedDeviceCount` when available, responsive estimate otherwise

### Added

#### Globals CSS (`app/globals.css`)
- **Jelly-In Keyframe**: Added `@keyframes jelly-in` — a multi-step elastic bounce animation (scale 0.3 → 1.06 → 0.95 → 1.02 → 0.99 → 1) that mimics macOS dock icon bounce behavior

---

## [2026-02-15] - Dashboard Skeleton Loading Animation

### Changed

#### Dashboard Page (`app/dashboard/page.tsx`)
- **Replaced Basic Skeleton Cards**: Swapped the 4 plain circle-skeleton cards with a new `DeviceCardSkeletonGrid` component that renders 8 realistic skeleton cards matching the SmartDeviceCard layout
- **Responsive Grid**: Skeleton grid now uses the same responsive breakpoints as the real device grid (`1/2/3/4/5` columns)

### Added

#### DeviceCardSkeleton (`components/devices/DeviceCardSkeleton.tsx`)
- **Realistic Card Shape**: Skeleton mirrors the SmartDeviceCard structure — left accent border, header with title and badge placeholders, icon area, toggle row, and slider row
- **Staggered Fade-In**: Each card animates in with a 100ms stagger for a smooth wave-like entrance
- **Shimmer Effect**: A subtle moving shimmer overlay sweeps across each card (per-card staggered delay)
- **DeviceCardSkeletonGrid**: Wrapper component renders 8 skeleton cards in the standard device grid layout

#### Globals CSS (`app/globals.css`)
- **Shimmer Keyframe**: Added `@keyframes shimmer` for the translating gradient overlay used in skeleton cards

---

## [2026-02-15] - Breadcrumb Fix

### Changed

#### Dynamic Breadcrumbs (`components/dynamic-breadcrumbs.tsx`)
- **Removed Redundant "HomeForge" Breadcrumb**: Removed the static "HomeForge" root breadcrumb that linked to `/`, since "Dashboard" already links to `/dashboard` and both led to the same page
- **Updated Separator Logic**: Separators now only appear between items, not before the first
- **Updated Mobile Visibility**: First and last breadcrumb items are always visible; middle items hidden on mobile

---

## [2026-02-04] - Device Builder UI Improvements

### Changed

#### Device UI Creator (`app/dashboard/device-builder/DeviceUICreator.tsx`)
- **Removed Compact Variant**: Removed unused "compact" layout style, keeping only Row and Square
- **Fixed Size Options**: Small, Medium, and Large sizes now work correctly for both layouts:
  - **Square widgets**: Large (`lg`) spans 2x2 grid cells
  - **Row widgets**: Small = 48px, Medium = 56px, Large = 80px height
- **Fixed Row Widget Filter**: Changed from `variant !== 'square'` to explicit `variant === 'row'`

#### Smart Auto-Generate Algorithm
Completely rewrote the auto-generate function with intelligent layout rules:

**Sensor Layout Strategy:**
| Count | Layout | Sizing |
|-------|--------|--------|
| 1 sensor | Row | Large (prominent single reading) |
| 2 sensors | Square grid | Medium (balanced pair) |
| 3 sensors | Square grid | First Large, others Medium |
| 4+ sensors | Square grid | First Large (if not motion), others Medium |

**Special Sensor Rules:**
- Motion sensors always Medium (binary state doesn't need emphasis)
- Temperature + Humidity pairs get matching sizes for visual consistency

**Control (Switch) Layout Strategy:**
| Count | Size |
|-------|------|
| 1 control | Large |
| 2-3 controls | Medium |
| 4+ controls | Small (compact list) |

#### Debug Panel (`app/dashboard/admin/debug/page.tsx`)
- **Removed Error Status**: Removed "Set Error" quick button and error option from dropdown (per user request)
- **Expanded Clickable Area**: Entire device card is now clickable to expand/collapse

---

## [2026-02-02] - Dashboard Loading State & Notification Fixes

### Changed

#### Dashboard Page (`app/dashboard/page.tsx`)
- **Fixed "No Devices" Flash**: Prevented false "no devices" message appearing during API refetches
- **Module-Level Cache**: Added `cachedDevicesExist` variable to persist device existence across component remounts
- **Improved Loading Logic**:
  - `isInitialLoading`: True only when data hasn't loaded yet OR loading without prior device data
  - `showNoDevices`: Only shows when truly no devices exist (never had devices before)
  - If devices existed before, shows skeleton instead of "no devices" during temporary empty responses
- **Array Safety**: Added `Array.isArray()` checks to ensure devices/rooms/deviceTypes are always arrays
- **Stale Time**: Added `staleTime: 2000` to devices query to reduce unnecessary refetches

#### Notification Center (`components/notifications/notification-center.tsx`)
- **URL Transformation Fix**: Updated `getActionUrl()` to handle more URL patterns:
  - Normalizes URLs by removing trailing slashes
  - Matches `/admin/device-types/\d+` pattern anywhere in URL (not just at start)
  - Properly redirects device type notifications to `/dashboard/admin/device-types?filter=pending`

#### Device Types Page (`app/dashboard/admin/device-types/page.tsx`)
- **URL Filter Support**: Added `useSearchParams` to read initial filter from URL query parameter
- **Deep Linking**: Navigating to `?filter=pending` auto-selects the pending filter on page load

#### Sidebar (`components/app-sidebar.tsx`)
- **Removed Badge Counts**: Removed pending count badge from Admin Panel and Device Types menu items
- **Removed Polling**: Removed `fetchPendingDeviceTypes` polling effect (notifications handle this now)
- **Cleanup**: Removed unused `pendingCount` state and interval

### Technical Details

The dashboard "no devices" flash was caused by:
1. React Query refetching devices every 3 seconds
2. Occasional 401 errors causing empty array responses
3. Component showing "no devices" before next successful fetch

Solution uses a module-level variable (`cachedDevicesExist`) that:
- Sets to `true` when devices are loaded
- Persists across component remounts
- Prevents "no devices" message when we know devices existed

---

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
