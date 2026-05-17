'use client';

import React, { useState, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  RotateCcw,
  Wifi,
  Lock,
  Server,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// The 3 mandatory variables that must exist in every firmware
const REQUIRED_VARIABLES = [
  { name: 'wifi_ssid', placeholder: '{{WIFI_SSID}}', icon: Wifi, description: 'WiFi network name' },
  { name: 'wifi_password', placeholder: '{{WIFI_PASSWORD}}', icon: Lock, description: 'WiFi password' },
  { name: 'server_ip', placeholder: '{{SERVER_IP}}', icon: Server, description: 'HomeForge server IP' },
] as const;

const DEFAULT_FIRMWARE_TEMPLATE = `#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ============================================
// HomeForge Connection Settings
// DO NOT rename these variables!
// They will be replaced with user values.
// ============================================
const char* wifi_ssid = "{{WIFI_SSID}}";
const char* wifi_password = "{{WIFI_PASSWORD}}";
const char* server_ip = "{{SERVER_IP}}";
const int mqtt_port = 1883;

// ============================================
// Device State
// ============================================
String deviceMac;
String deviceIp;
String stateTopic;

unsigned long lastMsg = 0;
const long interval = 5000;

WiFiClient espClient;
PubSubClient client(espClient);

// ============================================
// WiFi Setup
// ============================================
void setup_wifi() {
  delay(10);
  Serial.print("Connecting to ");
  Serial.println(wifi_ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid, wifi_password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi connected");
  deviceIp = WiFi.localIP().toString();
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");

  stateTopic = String("homeforge/devices/") + deviceMac + "/state";
}

// ============================================
// Publish state to MQTT
// ============================================
void publishState() {
  if (!client.connected()) return;

  StaticJsonDocument<256> doc;
  doc["ip"] = deviceIp;
  doc["mac"] = deviceMac;
  // TODO: Add your sensor readings to the JSON document
  // doc["temperature"] = temperature;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(stateTopic.c_str(), buffer);
}

// ============================================
// MQTT Reconnect
// ============================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    String clientId = "ESP32-" + deviceMac;
    if (client.connect(clientId.c_str())) {
      Serial.println(" connected!");
    } else {
      Serial.print(" failed (rc=");
      Serial.print(client.state());
      Serial.println("). Retrying in 5s...");
      delay(5000);
    }
  }
}

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);

  // TODO: Initialize your sensors here

  setup_wifi();
  client.setServer(server_ip, mqtt_port);
}

// ============================================
// Main Loop
// ============================================
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;

    // TODO: Read your sensors and call publishState()
    publishState();
  }
}
`;

interface FirmwareCodeEditorProps {
  onBack: () => void;
  onNext: (code: string) => void;
  initialCode?: string;
  editMode?: boolean;
  reviewMode?: boolean;
  isSubmitting?: boolean;
  deviceName?: string;
  onNameChange?: (name: string) => void;
}

export default function FirmwareCodeEditor({
  onBack,
  onNext,
  initialCode,
  editMode = false,
  reviewMode = false,
  deviceName = '',
  onNameChange,
}: FirmwareCodeEditorProps) {
  const [code, setCode] = useState(initialCode || DEFAULT_FIRMWARE_TEMPLATE);

  const highlight = useCallback((code: string) => {
    return Prism.highlight(code, Prism.languages.cpp, 'cpp');
  }, []);

  // Check for required placeholder patterns that get auto-swapped during device setup
  const variableStatus = REQUIRED_VARIABLES.map((v) => ({
    ...v,
    present: code.includes(v.placeholder),
  }));

  const allVariablesPresent = variableStatus.every((v) => v.present);
  const lineCount = code.split('\n').length;

  const handleNext = () => {
    if (!allVariablesPresent) {
      const missing = variableStatus.filter((v) => !v.present).map((v) => v.placeholder);
      toast.error('Missing required placeholders', {
        description: `Your code must include: ${missing.join(', ')}`,
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }
    onNext(code);
  };

  const handleReset = () => {
    setCode(DEFAULT_FIRMWARE_TEMPLATE);
    toast.success('Reset to template');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back: UI Designer</span>
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
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="text-muted-foreground">
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleReset} className="text-muted-foreground">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to template</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" onClick={handleNext} disabled={!allVariablesPresent}>
            <span className="hidden sm:inline">Next: Wiring</span>
            <span className="sm:hidden">Next</span>
            <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden p-4 md:p-6 gap-4">
        {/* Code Editor — same container as collection page viewer */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-[#1d1f21]">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-1.5 bg-[#282a2e] border-b border-[#373b41] text-xs text-[#969896] rounded-t-lg">
            <span>firmware.ino — C++ (Arduino)</span>
            <span>{lineCount} lines</span>
          </div>
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={highlight}
            padding={16}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: 14,
              lineHeight: 1.65,
              minHeight: '100%',
              color: '#c5c8c6',
            }}
            className="focus:outline-none [&>textarea]:!outline-none [&>textarea]:!text-transparent [&>textarea]:!caret-[#c5c8c6]"
            textareaClassName="focus:outline-none"
            readOnly={reviewMode}
          />
        </div>

        {/* Right Sidebar — Required Variables */}
        <div className="w-72 rounded-lg border border-border bg-card/50 p-4 flex flex-col gap-4 overflow-auto hidden md:flex shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Required Variables</h3>
            <p className="text-xs text-muted-foreground mb-3">
              These 3 variables must exist in your code. Users will fill in their values when deploying.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {variableStatus.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    v.present
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-destructive/30 bg-destructive/5'
                  )}
                >
                  <div className={cn(
                    'p-1.5 rounded-md',
                    v.present ? 'bg-green-500/10' : 'bg-destructive/10'
                  )}>
                    <Icon className={cn('w-4 h-4', v.present ? 'text-green-500' : 'text-destructive')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-mono font-medium', v.present ? 'text-green-500' : 'text-destructive')}>
                      {v.placeholder}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{v.description}</p>
                  </div>
                  {v.present ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Tip:</span> Write your ESP32 Arduino code here. 
              The three connection variables will be replaced with real values when a user deploys this device.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile variable status bar */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 border-t border-border bg-card/50">
        {variableStatus.map((v) => (
          <Badge
            key={v.name}
            variant="outline"
            className={cn(
              'text-[10px]',
              v.present
                ? 'border-green-500/30 text-green-500 bg-green-500/5'
                : 'border-destructive/30 text-destructive bg-destructive/5'
            )}
          >
            {v.present ? '✓' : '✗'} {v.placeholder}
          </Badge>
        ))}
      </div>
    </div>
  );
}
