import * as LucideIcons from 'lucide-react';

// Export the full map of icons (including aliases and utility functions)
export const ICON_MAP = LucideIcons as unknown as Record<string, any>;

// Filter keys to get only valid component names (Starts with Uppercase, excludes specific non-component exports if any)
// lucide-react exports 'icons', 'createLucideIcon', etc.
export const ICON_OPTIONS = Object.keys(ICON_MAP).filter(key => {
  // Simple heuristic: Must start with uppercase letter and be a function/object (component)
  // Also exclude 'Icon' generic component if present as named export
  return /^[A-Z]/.test(key) && key !== 'Icon' && typeof ICON_MAP[key] !== 'undefined';
});

export function getIconComponent(iconName: string) {
  // Handle direct match
  if (ICON_MAP[iconName]) return ICON_MAP[iconName];
  
  // Handle "fa-video" legacy style or other formats if needed, or return null
  return null;
}
