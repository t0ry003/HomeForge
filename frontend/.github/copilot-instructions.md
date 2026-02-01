# HomeForge Frontend - GitHub Copilot Instructions

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React

---

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── dashboard/          # Dashboard routes
│   │   ├── layout.tsx      # Dashboard layout
│   │   ├── page.tsx        # Dashboard home
│   │   ├── devices/        # Device management
│   │   ├── topology/       # Room topology
│   │   └── settings/       # User settings
│   ├── login/              # Authentication
│   └── register/
├── components/             # Reusable components
│   ├── ui/                 # shadcn/ui components
│   ├── devices/            # Device-specific components
│   └── topology/           # Topology components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
│   ├── apiClient.js        # API client
│   ├── utils.ts            # Helper functions
│   └── icons.ts            # Icon mappings
└── public/                 # Static assets
```

---

## TypeScript Best Practices

### Type Definitions

1. **Always define explicit types** - Avoid `any` type
2. **Use interfaces for objects** - Prefer `interface` over `type` for object shapes
3. **Export types** - Place shared types in dedicated type files

```typescript
// ✅ Good - Explicit interface
interface Device {
  id: number;
  name: string;
  deviceType: string;
  status: 'online' | 'offline';
  currentState: Record<string, unknown>;
}

// ❌ Bad - Using any
const device: any = fetchDevice();
```

### Type Naming Conventions

- **Interfaces**: PascalCase, descriptive names (`DeviceCardProps`, `UserProfile`)
- **Type aliases**: PascalCase (`DeviceStatus`, `RoomLayout`)
- **Enums**: PascalCase with PascalCase members

```typescript
// Props interfaces
interface DeviceCardProps {
  device: Device;
  onStatusChange: (id: number, status: DeviceStatus) => void;
  isEditable?: boolean;
}

// Union types for status
type DeviceStatus = 'online' | 'offline' | 'error';
```

---

## React Best Practices

### Component Structure

1. **Use functional components** with hooks
2. **One component per file** - Keep components focused
3. **Extract logic to custom hooks** - Separate concerns

```typescript
// ✅ Good - Clean component structure
'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useDevice } from '@/hooks/useDevice';

interface DeviceCardProps {
  deviceId: number;
}

export function DeviceCard({ deviceId }: DeviceCardProps) {
  const { device, updateStatus } = useDevice(deviceId);
  
  const handleToggle = useCallback(() => {
    updateStatus(device.status === 'online' ? 'offline' : 'online');
  }, [device.status, updateStatus]);

  return (
    <Card>
      <CardHeader>{device.name}</CardHeader>
      <CardContent>
        <button onClick={handleToggle}>Toggle</button>
      </CardContent>
    </Card>
  );
}
```

### Component Naming

- **Components**: PascalCase (`DeviceCard.tsx`, `TopologyCanvas.tsx`)
- **Hooks**: camelCase with `use` prefix (`useDevice.ts`, `useTopologyLayout.ts`)
- **Utilities**: camelCase (`formatDate.ts`, `apiClient.ts`)

### State Management

1. **Use React Query** for server state
2. **Use useState/useReducer** for local UI state
3. **Avoid prop drilling** - Use context for deeply nested data

```typescript
// ✅ Good - React Query for API data
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: () => apiClient.get('/devices/'),
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (device: Device) => apiClient.put(`/devices/${device.id}/`, device),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
```

---

## Next.js Best Practices

### App Router Conventions

1. **Use Server Components by default** - Add `'use client'` only when needed
2. **Colocate related files** - Keep page-specific components near their pages
3. **Use loading.tsx and error.tsx** - Handle loading and error states

```typescript
// Server Component (default)
export default async function DevicesPage() {
  const devices = await fetchDevices();
  return <DeviceList devices={devices} />;
}

// Client Component (when needed)
'use client';

export function DeviceControls({ device }: { device: Device }) {
  const [isOn, setIsOn] = useState(device.status === 'online');
  // Interactive logic here
}
```

### File Naming in App Router

- `page.tsx` - Route page component
- `layout.tsx` - Shared layout wrapper
- `loading.tsx` - Loading UI
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page

### API Routes

When creating API routes, follow REST conventions:

```typescript
// app/api/devices/route.ts
export async function GET() {
  // Handle GET request
}

export async function POST(request: Request) {
  // Handle POST request
}
```

---

## Styling with Tailwind CSS

### Class Organization

Order Tailwind classes consistently:

1. Layout (display, position, flex/grid)
2. Sizing (width, height, padding, margin)
3. Typography (font, text)
4. Visual (background, border, shadow)
5. Interactive (hover, focus, transition)

```typescript
// ✅ Good - Organized classes
<div className="flex items-center justify-between w-full p-4 text-sm font-medium bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
```

### Component Variants with cn()

Use the `cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

function Button({ variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        {
          'bg-primary text-white': variant === 'default',
          'bg-destructive text-white': variant === 'destructive',
          'border border-input bg-transparent': variant === 'outline',
        },
        {
          'px-2 py-1 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}
```

---

## shadcn/ui Usage

### Importing Components

```typescript
// Import from local ui directory
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
```

### Extending Components

When extending shadcn components, maintain the original API:

```typescript
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function LoadingButton({ isLoading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

---

## API Client Usage

### Making API Calls

Use the centralized API client for all backend requests:

```typescript
import apiClient from '@/lib/apiClient';

// GET request
const devices = await apiClient.get('/devices/');

// POST request
const newDevice = await apiClient.post('/devices/', {
  name: 'Living Room Light',
  device_type: 'light',
});

// PUT request
await apiClient.put(`/devices/${id}/`, updatedDevice);

// DELETE request
await apiClient.delete(`/devices/${id}/`);
```

### Error Handling

Always handle API errors gracefully:

```typescript
import { toast } from '@/components/ui/use-toast';

try {
  await apiClient.post('/devices/', deviceData);
  toast({ title: 'Device created successfully' });
} catch (error) {
  toast({
    title: 'Error creating device',
    description: error instanceof Error ? error.message : 'Unknown error',
    variant: 'destructive',
  });
}
```

---

## Performance Optimization

### Memoization

Use memoization for expensive computations:

```typescript
import { useMemo, useCallback } from 'react';

function DeviceList({ devices, filter }: DeviceListProps) {
  // Memoize filtered list
  const filteredDevices = useMemo(
    () => devices.filter(d => d.status === filter),
    [devices, filter]
  );

  // Memoize callback
  const handleSelect = useCallback((id: number) => {
    // Handle selection
  }, []);

  return (
    <ul>
      {filteredDevices.map(device => (
        <DeviceItem key={device.id} device={device} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

### Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/device-icon.png"
  alt="Device"
  width={64}
  height={64}
  priority={isAboveFold}
/>
```

---

## Testing Guidelines

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceCard } from './DeviceCard';

describe('DeviceCard', () => {
  it('renders device name', () => {
    render(<DeviceCard device={mockDevice} />);
    expect(screen.getByText(mockDevice.name)).toBeInTheDocument();
  });

  it('calls onToggle when button clicked', () => {
    const onToggle = jest.fn();
    render(<DeviceCard device={mockDevice} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(mockDevice.id);
  });
});
```

---

## Common Patterns

### Loading States

```typescript
function DeviceList() {
  const { data: devices, isLoading, error } = useDevices();

  if (isLoading) {
    return <DeviceListSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="grid gap-4">
      {devices.map(device => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}
```

### Form Handling

Use controlled components with proper validation:

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DeviceFormData {
  name: string;
  deviceType: string;
}

export function DeviceForm({ onSubmit }: { onSubmit: (data: DeviceFormData) => void }) {
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    deviceType: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Device name"
        required
      />
      <Button type="submit">Create Device</Button>
    </form>
  );
}
```

---

## Don'ts

1. ❌ Don't use `any` type - Always define proper types
2. ❌ Don't forget `'use client'` for interactive components
3. ❌ Don't leave `console.log` in production code
4. ❌ Don't hardcode API URLs - Use environment variables
5. ❌ Don't mutate state directly - Use setter functions
6. ❌ Don't ignore TypeScript errors - Fix them properly
7. ❌ Don't create massive components - Split into smaller pieces
8. ❌ Don't skip error boundaries - Handle errors gracefully

---

## Change Documentation Requirements

**Every modification to the frontend must be documented.** When making changes, always update the `CHANGELOG.md` file in the project root.

### Documentation Format

For each change, document the following:

```markdown
## [Date] - Brief Description

### Changed
- **File**: `path/to/modified/file.tsx`
- **Description**: What was changed and why
- **Impact**: Any components or features affected

### Added (if applicable)
- **File**: `path/to/new/file.tsx`
- **Description**: Purpose of the new file
- **Dependencies**: Any new dependencies added

### Removed (if applicable)
- **File**: `path/to/removed/file.tsx`
- **Reason**: Why it was removed
```

### What to Document

1. **Component changes** - New components, modified props, updated logic
2. **Style changes** - New CSS classes, theme modifications, layout changes
3. **API integration changes** - New endpoints, modified request/response handling
4. **State management changes** - New queries, mutations, context updates
5. **Configuration changes** - Environment variables, build settings, dependencies
6. **Bug fixes** - What was broken, how it was fixed
7. **Refactoring** - What was restructured and the reasoning

### Example Entry

```markdown
## [2026-02-01] - Add device filtering to DeviceList

### Changed
- **File**: `components/devices/DeviceList.tsx`
- **Description**: Added status filter dropdown to filter devices by online/offline status
- **Impact**: DeviceList component now accepts optional `initialFilter` prop

### Added
- **File**: `components/devices/DeviceFilter.tsx`
- **Description**: Reusable filter component for device status filtering
- **Dependencies**: None
```

### When to Document

- ✅ Document **immediately** after making changes
- ✅ Document **before** committing code
- ✅ Include relevant context for future developers
- ❌ Don't skip documentation for "small" changes
- ❌ Don't batch multiple unrelated changes in one entry

---

## Recommended MCP Servers

The following MCP (Model Context Protocol) servers enhance Copilot's capabilities for frontend development:

### Essential MCP Servers

| Server | Purpose | Installation |
|--------|---------|--------------|
| **@anthropic/mcp-server-shadcn-ui** | shadcn/ui component generation, documentation, and best practices | `npx @anthropic/mcp-server-shadcn-ui` |
| **@anthropic/mcp-server-tailwindcss** | Tailwind CSS class suggestions, documentation, and optimization | `npx @anthropic/mcp-server-tailwindcss` |
| **@anthropic/mcp-server-nextjs** | Next.js App Router patterns, API routes, and server components | `npx @anthropic/mcp-server-nextjs` |
| **@anthropic/mcp-server-react** | React hooks, patterns, and component best practices | `npx @anthropic/mcp-server-react` |
| **@anthropic/mcp-server-typescript** | TypeScript type inference, generics, and advanced patterns | `npx @anthropic/mcp-server-typescript` |

### Additional Recommended Servers

| Server | Purpose | Installation |
|--------|---------|--------------|
| **@anthropic/mcp-server-tanstack-query** | React Query patterns, caching strategies, mutations | `npx @anthropic/mcp-server-tanstack-query` |
| **@anthropic/mcp-server-lucide** | Lucide icon search and usage patterns | `npx @anthropic/mcp-server-lucide` |
| **@anthropic/mcp-server-eslint** | ESLint rules and auto-fix suggestions | `npx @anthropic/mcp-server-eslint` |
| **@anthropic/mcp-server-prettier** | Code formatting and style consistency | `npx @anthropic/mcp-server-prettier` |
| **@anthropic/mcp-server-zod** | Zod schema validation patterns | `npx @anthropic/mcp-server-zod` |

### VS Code MCP Configuration

Add to your VS Code `settings.json` or workspace `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "shadcn-ui": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-shadcn-ui"],
        "env": {
          "COMPONENTS_PATH": "./components/ui"
        }
      },
      "tailwindcss": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-tailwindcss"],
        "env": {
          "CONFIG_PATH": "./tailwind.config.ts"
        }
      },
      "nextjs": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-nextjs"],
        "env": {
          "APP_DIR": "./app"
        }
      },
      "react-query": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-tanstack-query"]
      },
      "typescript": {
        "command": "npx",
        "args": ["@anthropic/mcp-server-typescript"],
        "env": {
          "TSCONFIG_PATH": "./tsconfig.json"
        }
      }
    }
  }
}
```

### MCP Server Benefits for This Project

1. **shadcn/ui Server**: Generates components following the exact patterns used in `components/ui/`, suggests proper imports, and maintains consistency with existing button, card, and form components.

2. **Tailwind CSS Server**: Provides intelligent class suggestions based on `tailwind.config.ts`, helps with responsive design patterns, and suggests utility class combinations.

3. **Next.js Server**: Understands App Router conventions, helps with `page.tsx`/`layout.tsx` patterns, and suggests proper use of Server vs Client Components.

4. **React Query Server**: Assists with query key patterns, mutation setup, and cache invalidation strategies matching the existing `useDevices` and similar hooks.

5. **TypeScript Server**: Improves type inference for complex generics, helps with interface definitions, and ensures type safety across the codebase.
