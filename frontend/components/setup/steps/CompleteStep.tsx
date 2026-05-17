'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Home, Cpu, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface CompleteStepProps {
  roomsCreated: number;
  deviceTypesImported: number;
  onFinish: () => void;
}

export function CompleteStep({ roomsCreated, deviceTypesImported, onFinish }: CompleteStepProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center space-y-8">
      {/* Success icon */}
      <div className="relative flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-500 animate-pulse" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">You&apos;re All Set!</h1>
        <p className="text-muted-foreground">HomeForge is ready to use.</p>
      </div>

      {/* Summary */}
      {showContent && (
        <div className="space-y-3 max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 text-left">
            <Home className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {roomsCreated > 0 ? `${roomsCreated} room${roomsCreated > 1 ? 's' : ''} created` : 'No rooms created'}
              </p>
              <p className="text-xs text-muted-foreground">
                {roomsCreated > 0 ? 'Ready for your devices' : 'You can add rooms later in Admin Panel'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 text-left">
            <Cpu className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">
                {deviceTypesImported > 0 ? `${deviceTypesImported} device type${deviceTypesImported > 1 ? 's' : ''} imported` : 'No device types imported'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceTypesImported > 0 ? 'Available in Device Collection' : 'Build your own in Device Builder'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What's next hint */}
      <div className="text-xs text-muted-foreground max-w-sm mx-auto">
        <p>Next up: add your first physical device from the dashboard, or explore the Device Builder to design custom hardware.</p>
      </div>

      {/* CTA */}
      <Button size="lg" onClick={onFinish} className="gap-2 px-8">
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
