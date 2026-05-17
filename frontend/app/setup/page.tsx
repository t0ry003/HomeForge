'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSystemStatus } from '@/lib/apiClient';
import { SetupWizard } from '@/components/setup/SetupWizard';

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'fresh' | 'configured'>('loading');

  useEffect(() => {
    async function check() {
      try {
        const data = await getSystemStatus();
        setStatus(data.is_fresh ? 'fresh' : 'configured');
      } catch {
        // If endpoint doesn't exist, assume configured
        setStatus('configured');
      }
    }
    check();
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'configured') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Already Configured</h2>
            <p className="text-sm text-muted-foreground">
              This HomeForge instance has already been set up. If you need to make changes, use the Admin Panel.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => router.push('/login')}>
                Sign In
              </Button>
              <Button onClick={() => router.push('/dashboard')}>
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <SetupWizard />;
}
