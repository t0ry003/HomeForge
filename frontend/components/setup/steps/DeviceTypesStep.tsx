'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getImportDefaults, importDefaults } from '@/lib/apiClient';

interface DeviceTypesStepProps {
  onNext: (count: number) => void;
  onBack: () => void;
}

interface DefaultDeviceType {
  id: number;
  name: string;
  description?: string;
  category?: string;
}

export function DeviceTypesStep({ onNext, onBack }: DeviceTypesStepProps) {
  const [defaults, setDefaults] = useState<DefaultDeviceType[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getImportDefaults();
        const items = Array.isArray(data) ? data : data.defaults || data.device_types || [];
        setDefaults(items);
        // Select all by default
        setSelected(new Set(items.map((d: DefaultDeviceType) => d.name)));
      } catch {
        // If endpoint fails, show empty state
        setDefaults([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleItem = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(defaults.map(d => d.name)));
  const selectNone = () => setSelected(new Set());

  const handleNext = async () => {
    if (selected.size === 0 || defaults.length === 0) {
      onNext(0);
      return;
    }

    setImporting(true);
    setError('');
    try {
      // Import all defaults (backend typically imports all at once)
      await importDefaults();
      onNext(selected.size);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import device types.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Import Device Types</CardTitle>
        <CardDescription>
          Device types are templates for your hardware. Import community defaults to get started quickly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : defaults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cpu className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No default device types available from the server.</p>
            <p className="text-xs mt-1">You can build custom devices later using the Device Builder.</p>
          </div>
        ) : (
          <>
            {/* Select controls */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{selected.size} of {defaults.length} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll} className="text-primary hover:underline">Select All</button>
                <button type="button" onClick={selectNone} className="text-muted-foreground hover:underline">None</button>
              </div>
            </div>

            {/* Device type grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {defaults.map((item, idx) => {
                const isSelected = selected.has(item.name);
                return (
                  <button
                    key={item.name || idx}
                    type="button"
                    onClick={() => toggleItem(item.name)}
                    className={`px-3 py-3 rounded-lg border text-left text-sm font-medium transition-all truncate ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:border-primary/50 text-foreground'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={importing} className="gap-2">
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {selected.size === 0 || defaults.length === 0 ? 'Skip' : `Import ${selected.size} Type${selected.size > 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
