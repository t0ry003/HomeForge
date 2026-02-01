
import React, { useState } from 'react';
import { Node } from 'reactflow';
import { 
  ToggleLeft, 
  SlidersHorizontal, 
  Trash2, 
  Move,
  Settings2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Widget {
  id: string;
  type: 'TOGGLE' | 'SLIDER';
  label: string;
  variable_mapping: string;
  min?: number;
  max?: number;
  step?: number;
}

interface CardTemplateControl {
  widget_type: 'TOGGLE' | 'SLIDER';
  label: string;
  variable_mapping: string;
  min_value?: number | null;
  max_value?: number | null;
  step?: number | null;
}

interface CardTemplate {
  layout_config?: { w?: number; h?: number };
  controls?: CardTemplateControl[];
}

interface DeviceUICreatorProps {
  nodes: Node[];
  onBack: () => void;
  onSave: (template: any) => void;
  isSubmitting: boolean;
  initialCardTemplate?: CardTemplate | null;
  editMode?: boolean;
}

const WIDGET_TYPES = [
  { type: 'TOGGLE', icon: ToggleLeft, label: 'Toggle Switch', defaultLabel: 'Power' },
  { type: 'SLIDER', icon: SlidersHorizontal, label: 'Range Slider', defaultLabel: 'Level' },
] as const;

// Convert card_template controls to Widget format
function convertControlsToWidgets(controls: CardTemplateControl[]): Widget[] {
  return controls.map((control, index) => ({
    id: `widget-${Date.now()}-${index}`,
    type: control.widget_type,
    label: control.label,
    variable_mapping: control.variable_mapping,
    ...(control.widget_type === 'SLIDER' && {
      min: control.min_value ?? 0,
      max: control.max_value ?? 100,
      step: control.step ?? 1
    })
  }));
}

export default function DeviceUICreator({ nodes, onBack, onSave, isSubmitting, initialCardTemplate, editMode = false }: DeviceUICreatorProps) {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    // Initialize from card_template if provided
    if (initialCardTemplate?.controls && initialCardTemplate.controls.length > 0) {
      return convertControlsToWidgets(initialCardTemplate.controls);
    }
    return [];
  });
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Filter nodes suitable for mapping
  const mappableNodes = nodes.filter(n => n.data.type !== 'mcu');

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

  const addWidget = (type: typeof WIDGET_TYPES[number]['type']) => {
    const def = WIDGET_TYPES.find(t => t.type === type)!;
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      label: def.defaultLabel,
      variable_mapping: '',
      ...(type === 'SLIDER' && { min: 0, max: 100, step: 1 })
    };
    setWidgets([...widgets, newWidget]);
    toast.success(`Added ${def.label}`);
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const handleSave = () => {
    const unmappedWidgets = widgets.filter(w => !w.variable_mapping);
    if (unmappedWidgets.length > 0) {
        toast.error("Validation Failed", { description: "All widgets must be mapped to a variable." });
        return;
    }

    const requiredNodes = nodes.filter(n => n.data.type === 'switch');
    const mappedIds = new Set(widgets.map(w => w.variable_mapping));
    const missingNodes = requiredNodes.filter(n => !mappedIds.has(n.id));

    if (missingNodes.length > 0) {
        toast.error("Validation Failed", { 
            description: `You must add widgets for the following output components: ${missingNodes.map(n => n.data.label).join(', ')}` 
        });
        return;
    }

    const template = {
      layout_config: { w: 2, h: widgets.length }, 
      controls: widgets.map(w => ({
        widget_type: w.type,
        label: w.label,
        variable_mapping: w.variable_mapping,
        ...(w.type === 'SLIDER' && {
          min_value: w.min,
          max_value: w.max,
          step: w.step
        })
      }))
    };
    onSave(template);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Toolbar */}
      <div className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 text-muted-foreground hover:text-foreground">
             <ArrowLeft className="w-4 h-4 mr-2" />
             Back
          </Button>
          <div className="h-4 w-px bg-border hidden md:block" />
          <div className="flex items-center gap-2 text-foreground">
             <span className="font-semibold tracking-tight hidden sm:inline">UI Designer</span>
             {editMode ? (
               <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 ml-2">
                 EDITING
               </span>
             ) : (
               <Badge variant="outline" className="ml-2 font-mono text-[10px] hidden md:inline-flex">PREVIEW MODE</Badge>
             )}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                onClick={handleSave} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20"
                size="sm"
                disabled={isSubmitting || widgets.length === 0}
            >
                {isSubmitting ? "Submitting..." : "Propose Device"}
                <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
        </div>
      </div>

      {/* Mobile Add Button */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in zoom-in duration-300">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg shadow-primary/30" 
          onClick={() => setIsAddSheetOpen(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-background/20">
        <div className="flex w-full h-full md:rounded-2xl overflow-hidden md:border md:border-border bg-background shadow-2xl relative">
        
        {/* Left Panel: Toolbox */}
        <div className="w-72 border-r border-border p-4 hidden md:flex flex-col bg-card/30 backdrop-blur-xl overflow-y-auto">
            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Interface Components</h3>
            <div className="grid gap-3">
              {WIDGET_TYPES.map(t => (
                <Button
                  key={t.type}
                  variant="outline" 
                  className="h-auto py-4 px-4 justify-start gap-4 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  onClick={() => addWidget(t.type)}
                >
                  <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                     <t.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-semibold text-sm">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground">Add to layout</span>
                  </div>
                </Button>
              ))}
            </div>

            <Separator className="my-6" />

            <h3 className="text-xs font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Variable Status</h3>
            <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-2">
                  {mappableNodes.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No sensors available.</p>
                  ) : (
                      mappableNodes.map(node => {
                          const mappedCount = widgets.filter(w => w.variable_mapping === node.id).length;
                          const isMapped = mappedCount > 0;
                          return (
                              <div 
                                  key={node.id} 
                                  className={`
                                      flex items-center justify-between p-2 rounded-lg border text-xs transition-colors
                                      ${isMapped ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'}
                                  `}
                              >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <div className={`w-1.5 h-1.5 rounded-full ${isMapped ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                                      <span className="font-medium truncate">{node.data.label}</span>
                                  </div>
                                  {isMapped && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{mappedCount}</Badge>}
                              </div>
                          );
                      })
                  )}
                </div>
            </ScrollArea>
        </div>

        {/* Center Panel: Canvas */}
        <div className="flex-1 bg-background relative overflow-hidden flex flex-col items-center justify-center p-8">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.4] pointer-events-none" />
            
            <div className="w-full max-w-[400px] space-y-8 animate-in zoom-in-95 duration-300">
               <div className="text-center space-y-1">
                 <h2 className="text-lg font-semibold tracking-tight">UI Preview</h2>
                 <p className="text-sm text-muted-foreground">Configure the controls for your device.</p>
               </div>

               {/* Smart Device Card Preview */}
                <Card className="overflow-hidden border border-border/50 shadow-xl bg-card/60 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-semibold">Device Name</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                <span className="text-xs text-muted-foreground font-medium">Online</span>
                            </div>
                        </div>
                        <div className="p-2 rounded-full bg-muted/50">
                             <Settings2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-4 grid gap-3">
                        {widgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                <Move className="w-8 h-8 mb-3 opacity-30" />
                                <span className="text-sm font-medium">No Controls Added</span>
                                <span className="text-xs opacity-60">Add items from the left</span>
                            </div>
                        ) : (
                            widgets.map(widget => (
                                <div 
                                    key={widget.id}
                                    className={`
                                        group relative p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md
                                        ${selectedWidgetId === widget.id 
                                            ? 'border-primary ring-1 ring-primary bg-primary/5' 
                                            : 'border-border bg-card/40 hover:bg-card hover:border-primary/20'
                                        }
                                    `}
                                    onClick={() => setSelectedWidgetId(widget.id)}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                {widget.type === 'TOGGLE' && <ToggleLeft className="w-5 h-5" />}
                                                {widget.type === 'SLIDER' && <SlidersHorizontal className="w-5 h-5" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">{widget.label}</span>
                                                {!widget.variable_mapping ? (
                                                    <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                                                        Unmapped
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                        {nodes.find(n => n.id === widget.variable_mapping)?.data.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="shrink-0">
                                            {/* Preview Controls (Non-functional but visual) */}
                                            {widget.type === 'TOGGLE' && <Switch checked={true} className="pointer-events-none" />}
                                        </div>
                                    </div>
                                    
                                    {widget.type === 'SLIDER' && (
                                        <div className="mt-4 px-1 pb-1 pointer-events-none">
                                            <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </CardContent>
               </Card>
            </div>
        </div>
        </div>
      </div>


      {/* Mobile Add Sheet (Custom Implementation) */}
      <div className={`fixed inset-0 z-[60] md:hidden pointer-events-none`}>
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isAddSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
          onClick={() => setIsAddSheetOpen(false)}
        />
        
        <div className={`
          absolute bottom-0 left-0 right-0 
          bg-card border-t border-border rounded-t-3xl
          transition-transform duration-300 ease-out pointer-events-auto
          ${isAddSheetOpen ? 'translate-y-0' : 'translate-y-full'}
          shadow-2xl pb-8
        `}>
          <div className="p-6">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />
            
            <div className="grid grid-cols-4 gap-4">
              {WIDGET_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                  onClick={() => {
                    addWidget(t.type);
                    setIsAddSheetOpen(false);
                  }}
                >
                  <div 
                    className={`
                      w-16 h-16 rounded-xl flex items-center justify-center
                      border border-border bg-card/60 backdrop-blur-sm
                      shadow-sm
                    `}
                  >
                    <t.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Dialog (Popup) */}
      <Dialog open={!!selectedWidgetId} onOpenChange={(open) => !open && setSelectedWidgetId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configure Widget</DialogTitle>
            <DialogDescription>
              Adjust settings for this interface element.
            </DialogDescription>
          </DialogHeader>
          
          {selectedWidget && (
              <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                      <Label>Label</Label>
                      <Input 
                          value={selectedWidget.label} 
                          onChange={(e) => updateWidget(selectedWidget.id, { label: e.target.value })}
                          placeholder="e.g. Living Room Light"
                      />
                  </div>

                  <div className="grid gap-2">
                      <Label>Connected Variable</Label>
                      <Select 
                          value={selectedWidget.variable_mapping} 
                          onValueChange={(val) => updateWidget(selectedWidget.id, { variable_mapping: val })}
                      >
                          <SelectTrigger>
                              <SelectValue placeholder="Select a variable..." />
                          </SelectTrigger>
                          <SelectContent>
                              {mappableNodes.map(n => (
                                  <SelectItem key={n.id} value={n.id}>
                                      <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${(n.data.color || '').replace('text-','bg-').split(' ')[0]}`} />
                                          <span className="font-medium">{n.data.label}</span>
                                      </div>
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">The sensor or actuator this controls.</p>
                  </div>

                  {selectedWidget.type === 'SLIDER' && (
                      <div className="space-y-4 pt-2 border-t mt-2">
                          <Label>Range</Label>
                          <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">Min</span>
                                  <Input 
                                      type="number" 
                                      className="h-8"
                                      value={selectedWidget.min} 
                                      onChange={(e) => updateWidget(selectedWidget.id, { min: Number(e.target.value) })}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">Max</span>
                                  <Input 
                                      type="number" 
                                      className="h-8"
                                      value={selectedWidget.max} 
                                      onChange={(e) => updateWidget(selectedWidget.id, { max: Number(e.target.value) })}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">Step</span>
                                  <Input 
                                      type="number" 
                                      className="h-8"
                                      value={selectedWidget.step} 
                                      onChange={(e) => updateWidget(selectedWidget.id, { step: Number(e.target.value) })}
                                  />
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          )}
          
          <DialogFooter className="flex-row sm:justify-between items-center bg-muted/50 -mx-6 -mb-6 p-6 mt-2 border-t">
             <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => selectedWidgetId && removeWidget(selectedWidgetId)}
             >
                 <Trash2 className="w-4 h-4 mr-2" /> Delete
             </Button>
             <Button size="sm" onClick={() => setSelectedWidgetId(null)}>
                 Done
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
