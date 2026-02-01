# HomeForge Frontend Changelog

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
