'use client';

import React, { useCallback, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Loader2, Upload, Pencil, Eye, Bold, Italic, List, Link, Image, Code, Heading2, Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/lib/apiClient';

// ─── Undo/Redo history stack ───

interface HistoryEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function useUndoRedo(value: string, onChange: (v: string) => void) {
  const historyRef = useRef<HistoryEntry[]>([{ value, selectionStart: 0, selectionEnd: 0 }]);
  const indexRef = useRef(0);
  const isUndoRedoRef = useRef(false);

  const push = useCallback((entry: HistoryEntry) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const history = historyRef.current;
    // Trim any redo entries beyond current index
    historyRef.current = history.slice(0, indexRef.current + 1);
    historyRef.current.push(entry);
    // Limit stack to 100 entries
    if (historyRef.current.length > 100) {
      historyRef.current = historyRef.current.slice(-100);
    }
    indexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (indexRef.current <= 0) return;
    indexRef.current--;
    const entry = historyRef.current[indexRef.current];
    isUndoRedoRef.current = true;
    onChange(entry.value);
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.selectionStart = entry.selectionStart;
        textarea.selectionEnd = entry.selectionEnd;
        textarea.focus();
      });
    }
  }, [onChange]);

  const redo = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current++;
    const entry = historyRef.current[indexRef.current];
    isUndoRedoRef.current = true;
    onChange(entry.value);
    if (textarea) {
      requestAnimationFrame(() => {
        textarea.selectionStart = entry.selectionStart;
        textarea.selectionEnd = entry.selectionEnd;
        textarea.focus();
      });
    }
  }, [onChange]);

  const canUndo = indexRef.current > 0;
  const canRedo = indexRef.current < historyRef.current.length - 1;

  return { push, undo, redo, canUndo, canRedo };
}

// ─── Shared markdown renderer (read-only preview) ───

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          img: ({ node, ...props }) => {
            let src = String(props.src || '');
            // Resolve relative API/media paths against the backend URL
            if (src.startsWith('/api/') || src.startsWith('/media/')) {
              src = getMediaUrl(src) || src;
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img {...props} src={src} alt={props.alt || ''} className="rounded-lg max-w-full" style={{ backgroundColor: 'transparent' }} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// ─── Toolbar button helper ───

function ToolbarButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
        disabled && 'opacity-30 pointer-events-none'
      )}
    >
      {children}
    </button>
  );
}

// ─── Full markdown editor (write + preview toggle) ───

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
  defaultTab?: 'write' | 'preview';
}

export function MarkdownEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Write your content in Markdown…',
  readOnly = false,
  minHeight = '600px',
  className,
  defaultTab = 'write',
}: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>(defaultTab);
  const { push, undo, redo, canUndo, canRedo } = useUndoRedo(value, onChange);

  // Push to history whenever value changes from user typing
  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      const textarea = textareaRef.current;
      push({
        value: newValue,
        selectionStart: textarea?.selectionStart ?? newValue.length,
        selectionEnd: textarea?.selectionEnd ?? newValue.length,
      });
    },
    [onChange, push],
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        const newValue = value + text;
        handleChange(newValue);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      handleChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      });
    },
    [value, handleChange],
  );

  // Toggle wrap: if selection is already wrapped, unwrap it; otherwise wrap
  const toggleWrap = useCallback(
    (before: string, after: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);

      // Check if selection is already wrapped
      const beforeStart = start - before.length;
      const afterEnd = end + after.length;
      const alreadyWrapped =
        beforeStart >= 0 &&
        afterEnd <= value.length &&
        value.slice(beforeStart, start) === before &&
        value.slice(end, afterEnd) === after;

      let newValue: string;
      let newStart: number;
      let newEnd: number;

      if (alreadyWrapped) {
        // Unwrap: remove before/after markers
        newValue = value.slice(0, beforeStart) + selected + value.slice(afterEnd);
        newStart = beforeStart;
        newEnd = beforeStart + selected.length;
      } else {
        // Also check if the selected text itself starts/ends with the markers
        const innerWrapped =
          selected.startsWith(before) && selected.endsWith(after) && selected.length >= before.length + after.length;

        if (innerWrapped) {
          // Unwrap from inside the selection
          const unwrapped = selected.slice(before.length, selected.length - after.length);
          newValue = value.slice(0, start) + unwrapped + value.slice(end);
          newStart = start;
          newEnd = start + unwrapped.length;
        } else {
          // Wrap
          newValue = value.slice(0, start) + before + selected + after + value.slice(end);
          newStart = start + before.length;
          newEnd = start + before.length + selected.length;
        }
      }

      handleChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = newStart;
        textarea.selectionEnd = newEnd;
        textarea.focus();
      });
    },
    [value, handleChange],
  );

  // Toggle line prefix (e.g. ## for heading, - for list)
  const toggleLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;

      // Find beginning of current line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', start);
      const currentLine = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

      let newValue: string;
      let cursorOffset: number;

      if (currentLine.startsWith(prefix)) {
        // Remove prefix
        newValue = value.slice(0, lineStart) + currentLine.slice(prefix.length) + value.slice(lineEnd === -1 ? value.length : lineEnd);
        cursorOffset = -prefix.length;
      } else {
        // Add prefix
        newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
        cursorOffset = prefix.length;
      }

      handleChange(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;
        textarea.focus();
      });
    },
    [value, handleChange],
  );

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid file', { description: 'Only image files are supported.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', { description: 'Images must be under 5MB.' });
        return;
      }
      if (!onImageUpload) {
        toast.info('Image upload not available');
        return;
      }
      setUploading(true);
      try {
        const url = await onImageUpload(file);
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        insertAtCursor(`\n![${alt}](${url})\n`);
        toast.success('Image uploaded');
      } catch (e: any) {
        toast.error('Upload failed', { description: e.message || 'Could not upload image.' });
      } finally {
        setUploading(false);
      }
    },
    [onImageUpload, insertAtCursor],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleImageFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') { e.preventDefault(); toggleWrap('**', '**'); }
        else if (e.key === 'i') { e.preventDefault(); toggleWrap('*', '*'); }
        else if (e.key === 'k') { e.preventDefault(); toggleWrap('[', '](url)'); }
        else if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(textareaRef.current); }
        else if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(textareaRef.current); }
        else if (e.key === 'y') { e.preventDefault(); redo(textareaRef.current); }
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        insertAtCursor('  ');
      }
    },
    [toggleWrap, insertAtCursor, undo, redo],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onImageUpload) return;
      const items = Array.from(e.clipboardData.items);
      const imgItem = items.find((i) => i.type.startsWith('image/'));
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile();
        if (file) handleImageFile(file);
      }
    },
    [onImageUpload, handleImageFile],
  );

  // Read-only → just render the preview
  if (readOnly) {
    return (
      <div className={cn('rounded-lg border border-border bg-card overflow-hidden', className)}>
        <div className="p-6" style={{ minHeight }}>
          <MarkdownRenderer>{value}</MarkdownRenderer>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg border border-border overflow-hidden bg-card', className)}
      onDrop={(e) => {
        const files = Array.from(e.dataTransfer?.files || []);
        const img = files.find((f) => f.type.startsWith('image/'));
        if (img && onImageUpload) {
          e.preventDefault();
          handleImageFile(img);
        }
      }}
      onDragOver={(e) => {
        if (onImageUpload) e.preventDefault();
      }}
    >
      {/* Tab header + toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === 'write'
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Pencil className="w-3 h-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              activeTab === 'preview'
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>

        {/* Formatting toolbar (only in write mode) */}
        {activeTab === 'write' && (
          <div className="flex items-center gap-0.5">
            <ToolbarButton onClick={() => undo(textareaRef.current)} title="Undo (Ctrl+Z)" disabled={!canUndo}>
              <Undo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => redo(textareaRef.current)} title="Redo (Ctrl+Y)" disabled={!canRedo}>
              <Redo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton onClick={() => toggleLinePrefix('## ')} title="Heading">
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => toggleWrap('**', '**')} title="Bold (Ctrl+B)">
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => toggleWrap('*', '*')} title="Italic (Ctrl+I)">
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => toggleLinePrefix('- ')} title="List">
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => toggleWrap('[', '](url)')} title="Link (Ctrl+K)">
              <Link className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={() => toggleWrap('`', '`')} title="Inline code">
              <Code className="w-3.5 h-3.5" />
            </ToolbarButton>
            {onImageUpload && (
              <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload image">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
              </ToolbarButton>
            )}
          </div>
        )}
      </div>

      {/* Editor / Preview content */}
      {activeTab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="w-full resize-none bg-card text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed p-4 focus:outline-none"
          style={{ minHeight }}
          spellCheck={false}
        />
      ) : (
        <div className="overflow-auto p-6 bg-card" style={{ minHeight }}>
          <MarkdownRenderer>{value}</MarkdownRenderer>
        </div>
      )}

      {onImageUpload && activeTab === 'write' && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          Attach images by dragging & dropping, pasting, or{' '}
          <button
            type="button"
            className="text-primary hover:underline cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            selecting them
          </button>
          .
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
