'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Sun, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSolarSystem } from '@/lib/apiClient';

interface SolarStepProps {
  onNext: (connected: boolean) => void;
  onBack: () => void;
}

const PROVIDERS = [{ value: 'fronius', label: 'Fronius Solar API V1' }];

export function SolarStep({ onNext, onBack }: SolarStepProps) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [provider, setProvider] = useState('fronius');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const canConnect = name.trim().length > 0 && baseUrl.trim().length > 0;

  const handleConnect = async () => {
    if (!canConnect) return;
    setConnecting(true);
    setError('');
    try {
      await createSolarSystem({
        name: name.trim(),
        base_url: baseUrl.trim(),
        provider,
      });
      onNext(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach the system at the provided link.'
      );
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sun className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Connect a Solar System</CardTitle>
        <CardDescription>
          Link your inverter&apos;s API to see a live power-flow view. HomeForge
          stores only the link and reads it server-side. This step is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="setup-solar-name">Name</Label>
          <Input
            id="setup-solar-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rooftop PV"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-solar-url">API URL</Label>
          <Input
            id="setup-solar-url"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://fronius-server:9999"
          />
          <p className="text-xs text-muted-foreground">
            Base URL of the vendor API reachable from the HomeForge server.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-solar-provider">Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="setup-solar-provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Only Fronius is supported today. Support for more solar APIs is
            coming soon — you can add or change a system any time from the Solar
            page.
          </span>
        </div>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onNext(false)}
              disabled={connecting}
            >
              Skip
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!canConnect || connecting}
              className="gap-2"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Connect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
