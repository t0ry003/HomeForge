'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import {
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadDocumentationImage } from '@/lib/apiClient';

const DEFAULT_DOCUMENTATION_TEMPLATE = `# Device Name

## Overview
Briefly describe what this device does and its main use case.

## Parts List
| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 Dev Board | 1 | Any ESP32 variant |
| | | |

## Features
- Feature 1
- Feature 2

## Assembly Instructions
1. Step one
2. Step two

## Troubleshooting
- **Issue**: Device won't connect to WiFi  
  **Fix**: Check that SSID and password are correct

## Notes
Add any additional notes here.
`;

interface DocumentationEditorProps {
  onBack: () => void;
  onSubmit: (documentation: string) => void;
  initialDocumentation?: string;
  editMode?: boolean;
  reviewMode?: boolean;
  isSubmitting?: boolean;
  deviceTypeId?: number;
  deviceName?: string;
  onNameChange?: (name: string) => void;
}

export default function DocumentationEditor({
  onBack,
  onSubmit,
  initialDocumentation,
  editMode = false,
  reviewMode = false,
  isSubmitting = false,
  deviceTypeId,
  deviceName = '',
  onNameChange,
}: DocumentationEditorProps) {
  const [documentation, setDocumentation] = useState(
    initialDocumentation || DEFAULT_DOCUMENTATION_TEMPLATE
  );

  const handleSubmit = () => {
    if (!documentation.trim()) {
      toast.error('Documentation required', {
        description: 'Add some documentation to help other users build this device.',
      });
      return;
    }
    if (documentation.trim().length < 50) {
      toast.error('Documentation too short', {
        description: 'Please write at least a few sentences describing your device.',
      });
      return;
    }
    onSubmit(documentation);
  };

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const data = await uploadDocumentationImage(file, deviceTypeId as any);
    return data.url;
  }, [deviceTypeId]);

  const wordCount = documentation.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back: Wiring</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-4 w-px bg-border hidden md:block" />
          {onNameChange && (
            <input
              value={deviceName}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-7 w-28 md:w-48 px-2 rounded-md border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 truncate"
              placeholder="Device Name"
              readOnly={reviewMode}
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">{wordCount} words</span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-1">⏳</span>
                <span className="hidden sm:inline">Submitting...</span>
              </>
            ) : reviewMode ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Approve & Save</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : editMode ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Submit Device</span>
                <span className="sm:hidden">Submit</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <MarkdownEditor
            value={documentation}
            onChange={setDocumentation}
            onImageUpload={handleImageUpload}
            placeholder="Write your device documentation in Markdown..."
            readOnly={reviewMode}
            minHeight="calc(100vh - 12rem)"
          />
        </div>
      </div>
    </div>
  );
}
