'use client';

import { Home, Cpu, Wifi, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeForgeLogo } from '@/components/homeforge-logo';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-8">
      {/* Logo */}
      <div className="flex justify-center">
        <HomeForgeLogo size={80} />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to HomeForge</h1>
        <p className="text-muted-foreground text-lg">Your Smart Home OS</p>
      </div>

      {/* Feature bullets */}
      <div className="grid gap-4 text-left max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Organize by Rooms</p>
            <p className="text-xs text-muted-foreground">Group and manage devices by physical location</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Build Custom Devices</p>
            <p className="text-xs text-muted-foreground">Design hardware with firmware, wiring, and documentation</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Real-time Monitoring</p>
            <p className="text-xs text-muted-foreground">View network topology and device status live</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-sm">Community-driven</p>
            <p className="text-xs text-muted-foreground">Share and import device templates from others</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="pt-2">
        <Button size="lg" onClick={onNext} className="px-8">
          Get Started
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          This will set up your HomeForge server for the first time.
        </p>
      </div>
    </div>
  );
}
