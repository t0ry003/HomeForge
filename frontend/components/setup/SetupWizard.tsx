'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeStep } from './steps/WelcomeStep';
import { AdminAccountStep } from './steps/AdminAccountStep';
import { RoomsStep } from './steps/RoomsStep';
import { DeviceTypesStep } from './steps/DeviceTypesStep';
import { CompleteStep } from './steps/CompleteStep';

const STEPS = ['welcome', 'account', 'rooms', 'devices', 'complete'] as const;
type Step = typeof STEPS[number];

interface SetupState {
  roomsCreated: number;
  deviceTypesImported: number;
}

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [accountCreated, setAccountCreated] = useState(false);
  const [setupState, setSetupState] = useState<SetupState>({
    roomsCreated: 0,
    deviceTypesImported: 0,
  });

  const currentIndex = STEPS.indexOf(currentStep);

  const goNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentIndex - 1;
    // Don't allow going back to account step once account is created
    if (prevIndex >= 0 && !(STEPS[prevIndex] === 'account' && accountCreated)) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentIndex, accountCreated]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('onboarding_setup_complete', 'true');
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="w-full px-6 pt-6">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center gap-1">
              {STEPS.slice(1, -1).map((step, i) => (
                <div key={step} className="flex-1 flex items-center gap-1">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                      STEPS.indexOf(step) <= currentIndex
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Step {currentIndex} of {STEPS.length - 2}
            </p>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl animate-in fade-in duration-300">
          {currentStep === 'welcome' && (
            <WelcomeStep onNext={goNext} />
          )}
          {currentStep === 'account' && (
            <AdminAccountStep onNext={() => {
              setAccountCreated(true);
              goNext();
            }} />
          )}
          {currentStep === 'rooms' && (
            <RoomsStep
              onNext={(count) => {
                setSetupState(s => ({ ...s, roomsCreated: count }));
                goNext();
              }}
              onBack={goBack}
            />
          )}
          {currentStep === 'devices' && (
            <DeviceTypesStep
              onNext={(count) => {
                setSetupState(s => ({ ...s, deviceTypesImported: count }));
                goNext();
              }}
              onBack={goBack}
            />
          )}
          {currentStep === 'complete' && (
            <CompleteStep
              roomsCreated={setupState.roomsCreated}
              deviceTypesImported={setupState.deviceTypesImported}
              onFinish={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
