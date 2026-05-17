'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];

interface WiringDiagramEditorProps {
  onBack: () => void;
  onNext: (data: { wiringDiagramText: string; wiringDiagramFile: File | null; wiringDiagramPreview: string | null }) => void;
  initialText?: string;
  initialImagePreview?: string | null;
  initialFile?: File | null;
  editMode?: boolean;
  reviewMode?: boolean;
  deviceName?: string;
  onNameChange?: (name: string) => void;
}

export default function WiringDiagramEditor({
  onBack,
  onNext,
  initialText = '',
  initialImagePreview = null,
  initialFile = null,
  editMode = false,
  reviewMode = false,
  deviceName = '',
  onNameChange,
}: WiringDiagramEditorProps) {
  const [imageFile, setImageFile] = useState<File | null>(initialFile);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImagePreview);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview when initialImagePreview prop changes (e.g. from async data load in edit mode)
  useEffect(() => {
    if (initialImagePreview && !imagePreview && !imageFile) {
      setImagePreview(initialImagePreview);
    }
  }, [initialImagePreview]);

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error('Invalid format', { description: 'Use PNG, JPG, or WEBP images' });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', { description: 'Maximum size is 5MB' });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    toast.success('Image added');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNext = () => {
    if (!imagePreview) {
      toast.error('Wiring diagram required', {
        description: 'Upload a wiring diagram image to continue.',
      });
      return;
    }
    onNext({
      wiringDiagramText: '',
      wiringDiagramFile: imageFile,
      wiringDiagramPreview: imagePreview,
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back: Firmware</span>
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
        <Button size="sm" onClick={handleNext} className="shrink-0">
          <span className="hidden sm:inline">Next: Documentation</span>
          <span className="sm:hidden">Next</span>
          <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              Wiring Diagram Image
            </Label>
            <p className="text-xs text-muted-foreground">
              Upload a photo or diagram showing how to wire the components. PNG, JPG, or WEBP up to 5MB.
            </p>

            {imagePreview ? (
              <div className="relative group rounded-lg border border-border overflow-hidden bg-muted/20">
                <img
                  src={imagePreview}
                  alt="Wiring diagram"
                  className="w-full max-h-[400px] object-contain p-2"
                />
                {!reviewMode && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Replace
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !reviewMode && fileInputRef.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-10 rounded-lg border-2 border-dashed transition-colors cursor-pointer',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  reviewMode && 'cursor-default opacity-60'
                )}
              >
                <div className="p-3 rounded-full bg-muted/50">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drop your wiring diagram here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse files
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FORMATS.join(',')}
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
