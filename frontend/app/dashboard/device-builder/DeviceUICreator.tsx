
import React, { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ToggleLeft, 
  SlidersHorizontal, 
  Trash2, 
  Settings2,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Thermometer,
  Droplets,
  Activity,
  Sun,
  Wind,
  Wand2,
  LayoutGrid,
  Rows3,
  GripVertical,
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
import { cn } from "@/lib/utils";

type WidgetType = 'TOGGLE' | 'SLIDER' | 'TEMPERATURE' | 'HUMIDITY' | 'MOTION' | 'LIGHT' | 'CO2';
type WidgetVariant = 'row' | 'square';
type WidgetSize = 'sm' | 'md' | 'lg';

interface Widget {
  id: string;
  type: WidgetType;
  label: string;
  variable_mapping: string;
  min?: number;
  max?: number;
  step?: number;
  variant?: WidgetVariant;
  size?: WidgetSize;
  unit?: string;
}

interface CardTemplateControl {
  widget_type: WidgetType;
  label: string;
  variable_mapping: string;
  min_value?: number | null;
  max_value?: number | null;
  step?: number | null;
  variant?: WidgetVariant;
  size?: WidgetSize;
  unit?: string;
}

interface CardTemplate {
  layout_config?: { columns?: number; gap?: string };
  controls?: CardTemplateControl[];
}

interface DeviceUICreatorProps {
  nodes: Node[];
  onBack: () => void;
  onSave: (template: any) => void;
  isSubmitting: boolean;
  initialCardTemplate?: CardTemplate | null;
  editMode?: boolean;
  reviewMode?: boolean;
}

// Control widgets (for relays/switches)
const CONTROL_WIDGET_TYPES = [
  { type: 'TOGGLE' as WidgetType, icon: ToggleLeft, label: 'Toggle Switch', defaultLabel: 'Power', category: 'control' },
  { type: 'SLIDER' as WidgetType, icon: SlidersHorizontal, label: 'Range Slider', defaultLabel: 'Level', category: 'control' },
];

// Sensor display widgets (read-only monitoring)
const SENSOR_WIDGET_TYPES = [
  { type: 'TEMPERATURE' as WidgetType, icon: Thermometer, label: 'Temperature', defaultLabel: 'Temperature', category: 'sensor', unit: '°C' },
  { type: 'HUMIDITY' as WidgetType, icon: Droplets, label: 'Humidity', defaultLabel: 'Humidity', category: 'sensor', unit: '%' },
  { type: 'MOTION' as WidgetType, icon: Activity, label: 'Motion Sensor', defaultLabel: 'Motion', category: 'sensor' },
  { type: 'LIGHT' as WidgetType, icon: Sun, label: 'Light Sensor', defaultLabel: 'Light Level', category: 'sensor', unit: 'lux' },
  { type: 'CO2' as WidgetType, icon: Wind, label: 'Air Quality', defaultLabel: 'CO2', category: 'sensor', unit: 'ppm' },
];

const ALL_WIDGET_TYPES = [...CONTROL_WIDGET_TYPES, ...SENSOR_WIDGET_TYPES];

// Map node types to widget types for auto-generation
const NODE_TO_WIDGET_MAP: Record<string, WidgetType> = {
  'switch': 'TOGGLE',
  'temperature': 'TEMPERATURE',
  'humidity': 'HUMIDITY',
  'motion': 'MOTION',
  'light': 'LIGHT',
  'co2': 'CO2',
};

// Get widget-specific colors
const getWidgetColors = (type: WidgetType) => {
  switch(type) {
    case 'TOGGLE': return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' };
    case 'SLIDER': return { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' };
    case 'TEMPERATURE': return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' };
    case 'HUMIDITY': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' };
    case 'MOTION': return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' };
    case 'LIGHT': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500' };
    case 'CO2': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' };
    default: return { bg: 'bg-muted/10', border: 'border-border/50', text: 'text-muted-foreground' };
  }
};

// Sortable Square Widget Component
interface SortableSquareWidgetProps {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableSquareWidget({ widget, isSelected, onSelect }: SortableSquareWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const colors = getWidgetColors(widget.type);
  
  // Size classes for grid spanning
  const sizeClasses = {
    sm: '',
    md: '',
    lg: 'col-span-2 row-span-2',
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-2 rounded-xl border transition-all cursor-pointer aspect-square overflow-hidden",
        "flex flex-col items-center justify-center touch-manipulation",
        isSelected 
          ? 'ring-2 ring-primary border-primary' 
          : `${colors.border} ${colors.bg} hover:shadow-md`,
        isDragging && 'shadow-xl ring-2 ring-primary',
        sizeClasses[widget.size || 'md']
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 rounded bg-background/80 hover:bg-background border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
      
      {/* TOGGLE */}
      {widget.type === 'TOGGLE' && (
        <>
          <ToggleLeft className={`w-5 h-5 ${colors.text} mb-1`} />
          <span className={`text-lg font-bold leading-none ${colors.text}`}>ON</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-1 text-center truncate w-full px-1">{widget.label}</span>
        </>
      )}
      
      {/* SLIDER */}
      {widget.type === 'SLIDER' && (
        <>
          <SlidersHorizontal className={`w-4 h-4 ${colors.text} mb-1`} />
          <span className={`text-lg font-bold leading-none ${colors.text}`}>50%</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-1 text-center truncate w-full px-1">{widget.label}</span>
        </>
      )}
      
      {/* Sensor icons */}
      {widget.type === 'TEMPERATURE' && <Thermometer className={`w-4 h-4 ${colors.text} mb-1`} />}
      {widget.type === 'HUMIDITY' && <Droplets className={`w-4 h-4 ${colors.text} mb-1`} />}
      {widget.type === 'MOTION' && <Activity className={`w-6 h-6 ${colors.text}`} />}
      {widget.type === 'LIGHT' && <Sun className={`w-4 h-4 ${colors.text} mb-1`} />}
      {widget.type === 'CO2' && <Wind className={`w-4 h-4 ${colors.text} mb-1`} />}
      
      {/* Motion display */}
      {widget.type === 'MOTION' && (
        <span className={`text-xs font-semibold uppercase tracking-wide mt-1 ${colors.text}`}>Clear</span>
      )}
      
      {/* Sensor values */}
      {(widget.type === 'TEMPERATURE' || widget.type === 'HUMIDITY' || widget.type === 'LIGHT' || widget.type === 'CO2') && (
        <>
          <div className="flex items-baseline">
            <span className={`text-lg font-bold tabular-nums leading-none ${colors.text}`}>
              {widget.type === 'TEMPERATURE' && '23.5'}
              {widget.type === 'HUMIDITY' && '65'}
              {widget.type === 'LIGHT' && '450'}
              {widget.type === 'CO2' && '520'}
            </span>
            <span className="text-xs text-muted-foreground ml-0.5">
              {widget.unit || (widget.type === 'TEMPERATURE' ? '°C' : widget.type === 'HUMIDITY' ? '%' : widget.type === 'LIGHT' ? 'lux' : 'ppm')}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-1">{widget.label}</span>
        </>
      )}
      
      {!widget.variable_mapping && (
        <Badge variant="destructive" className="absolute top-1 right-1 text-[8px] px-1 py-0">!</Badge>
      )}
    </div>
  );
}

// Sortable Row Widget Component
interface SortableRowWidgetProps {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
  mappedLabel?: string;
}

function SortableRowWidget({ widget, isSelected, onSelect, mappedLabel }: SortableRowWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };
  
  // Size classes for row height
  const sizeClasses = {
    sm: 'h-12 py-1.5',
    md: 'h-14 py-2',
    lg: 'h-20 py-4',
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative px-3 rounded-xl border transition-all cursor-pointer touch-manipulation",
        sizeClasses[widget.size || 'md'],
        isSelected 
          ? 'border-primary ring-2 ring-primary bg-primary/5' 
          : 'border-border bg-card/40 hover:bg-card hover:border-primary/20 hover:shadow-md',
        isDragging && 'shadow-xl'
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded bg-background/80 hover:bg-background border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
      
      <div className="flex items-center justify-between gap-3 pl-6">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {widget.type === 'TOGGLE' && <ToggleLeft className="w-5 h-5" />}
            {widget.type === 'SLIDER' && <SlidersHorizontal className="w-5 h-5" />}
            {widget.type === 'TEMPERATURE' && <Thermometer className="w-5 h-5 text-orange-500" />}
            {widget.type === 'HUMIDITY' && <Droplets className="w-5 h-5 text-cyan-500" />}
            {widget.type === 'MOTION' && <Activity className="w-5 h-5 text-red-500" />}
            {widget.type === 'LIGHT' && <Sun className="w-5 h-5 text-yellow-500" />}
            {widget.type === 'CO2' && <Wind className="w-5 h-5 text-gray-500" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{widget.label}</span>
            {!widget.variable_mapping ? (
              <span className="text-[10px] text-destructive font-medium">Unmapped</span>
            ) : (
              <span className="text-[10px] text-muted-foreground truncate">{mappedLabel}</span>
            )}
          </div>
        </div>
        
        <div className="shrink-0">
          {widget.type === 'TOGGLE' && <Switch checked={true} className="pointer-events-none" />}
          {widget.type === 'TEMPERATURE' && <span className="text-sm font-bold text-orange-500">23.5°C</span>}
          {widget.type === 'HUMIDITY' && <span className="text-sm font-bold text-cyan-500">65%</span>}
          {widget.type === 'MOTION' && <Badge variant="secondary" className="text-[10px]">Clear</Badge>}
          {widget.type === 'LIGHT' && <span className="text-sm font-bold text-yellow-500">450 lux</span>}
          {widget.type === 'CO2' && <span className="text-sm font-bold text-gray-500">520 ppm</span>}
        </div>
      </div>
      
      {widget.type === 'SLIDER' && (
        <div className="mt-4 px-1 pb-1 pointer-events-none">
          <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
        </div>
      )}
    </div>
  );
}

// Convert card_template controls to Widget format
function convertControlsToWidgets(controls: CardTemplateControl[]): Widget[] {
  return controls.map((control, index) => ({
    id: `widget-${Date.now()}-${index}`,
    type: control.widget_type,
    label: control.label,
    variable_mapping: control.variable_mapping,
    variant: control.variant || 'row',
    size: control.size || 'md',
    unit: control.unit,
    ...(control.widget_type === 'SLIDER' && {
      min: control.min_value ?? 0,
      max: control.max_value ?? 100,
      step: control.step ?? 1
    })
  }));
}

// Auto-generate widgets from nodes
// Algorithm:
// 1. Separate sensors and controls
// 2. For sensors:
//    - 1 sensor: row layout, large size (prominent single reading)
//    - 2 sensors: square layout, medium size (balanced grid)
//    - 3 sensors: 1 large square + 2 medium squares OR 3 medium squares
//    - 4+ sensors: square layout, alternate sizes for visual hierarchy
// 3. For controls (switches):
//    - 1 control: row layout, large size
//    - 2-3 controls: row layout, medium size
//    - 4+ controls: row layout, small size (compact list)
// 4. Pair related sensors (temp+humidity) with matching sizes
// 5. Motion sensors always get medium size (binary state doesn't need emphasis)
function autoGenerateWidgets(nodes: Node[]): Widget[] {
  const mappableNodes = nodes.filter(n => n.data.type !== 'mcu');
  const widgets: Widget[] = [];
  
  // Separate sensors and controls
  const sensorTypes = ['temperature', 'humidity', 'motion', 'light', 'co2'];
  const sensorNodes = mappableNodes.filter(n => sensorTypes.includes(n.data.type));
  const controlNodes = mappableNodes.filter(n => n.data.type === 'switch');
  
  // Detect related sensor pairs for layout grouping
  const hasTemp = sensorNodes.some(n => n.data.type === 'temperature');
  const hasHumidity = sensorNodes.some(n => n.data.type === 'humidity');
  const hasTempHumidityPair = hasTemp && hasHumidity;
  
  // Determine sensor layout strategy based on count
  const sensorCount = sensorNodes.length;
  let sensorVariant: WidgetVariant = 'square';
  let defaultSensorSize: WidgetSize = 'md';
  
  if (sensorCount === 1) {
    // Single sensor: row layout, large for prominence
    sensorVariant = 'row';
    defaultSensorSize = 'lg';
  } else if (sensorCount === 2) {
    // Two sensors: square grid, medium size
    sensorVariant = 'square';
    defaultSensorSize = 'md';
  } else if (sensorCount >= 3) {
    // 3+ sensors: square grid, varied sizes
    sensorVariant = 'square';
    defaultSensorSize = 'md';
  }
  
  // Add sensor widgets with intelligent sizing
  sensorNodes.forEach((node, index) => {
    const widgetType = NODE_TO_WIDGET_MAP[node.data.type];
    const widgetDef = ALL_WIDGET_TYPES.find(w => w.type === widgetType);
    if (widgetType && widgetDef) {
      let size: WidgetSize = defaultSensorSize;
      
      // Apply smart sizing rules
      if (sensorCount === 1) {
        size = 'lg';
      } else if (sensorCount === 3 && index === 0) {
        // First sensor gets large size for visual hierarchy
        size = 'lg';
      } else if (sensorCount >= 4) {
        // Alternate sizes for visual rhythm: first large, rest medium
        // But motion sensors stay medium (binary doesn't need large)
        if (index === 0 && node.data.type !== 'motion') {
          size = 'lg';
        } else {
          size = 'md';
        }
      }
      
      // Motion sensors: always medium (binary state)
      if (node.data.type === 'motion') {
        size = 'md';
      }
      
      // Temp/Humidity pairs: same size for visual consistency
      if (hasTempHumidityPair && (node.data.type === 'temperature' || node.data.type === 'humidity')) {
        size = sensorCount <= 2 ? 'md' : 'md';
      }
      
      widgets.push({
        id: `widget-auto-${Date.now()}-${index}`,
        type: widgetType,
        label: node.data.label || widgetDef.defaultLabel,
        variable_mapping: node.id,
        variant: sensorVariant,
        size,
        unit: 'unit' in widgetDef ? widgetDef.unit : undefined,
      });
    }
  });
  
  // Determine control layout strategy based on count
  const controlCount = controlNodes.length;
  let controlSize: WidgetSize = 'md';
  
  if (controlCount === 1) {
    controlSize = 'lg';
  } else if (controlCount >= 4) {
    controlSize = 'sm';
  }
  
  // Add control widgets (always row layout for easy toggling)
  controlNodes.forEach((node, index) => {
    widgets.push({
      id: `widget-auto-ctrl-${Date.now()}-${index}`,
      type: 'TOGGLE',
      label: node.data.label || 'Power',
      variable_mapping: node.id,
      variant: 'row',
      size: controlSize,
    });
  });
  
  return widgets;
}

export default function DeviceUICreator({ nodes, onBack, onSave, isSubmitting, initialCardTemplate, editMode = false, reviewMode = false }: DeviceUICreatorProps) {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    // Initialize from card_template if provided
    if (initialCardTemplate?.controls && initialCardTemplate.controls.length > 0) {
      return convertControlsToWidgets(initialCardTemplate.controls);
    }
    return [];
  });
  const [layoutColumns, setLayoutColumns] = useState<number>(2);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Filter nodes suitable for mapping
  const mappableNodes = nodes.filter(n => n.data.type !== 'mcu');

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

  // Auto-generate widgets from topology
  const handleAutoGenerate = () => {
    const autoWidgets = autoGenerateWidgets(nodes);
    if (autoWidgets.length === 0) {
      toast.error("No mappable sensors found", { description: "Add sensors to your topology first." });
      return;
    }
    setWidgets(autoWidgets);
    toast.success(`Generated ${autoWidgets.length} widgets from topology`);
  };

  const addWidget = (type: WidgetType) => {
    const def = ALL_WIDGET_TYPES.find(t => t.type === type);
    if (!def) return;
    
    const isSensor = SENSOR_WIDGET_TYPES.some(s => s.type === type);
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      label: def.defaultLabel,
      variable_mapping: '',
      variant: isSensor ? 'square' : 'row',
      size: 'md',
      unit: 'unit' in def ? def.unit : undefined,
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

  // DnD sensors - supports mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    const unmappedWidgets = widgets.filter(w => !w.variable_mapping);
    if (unmappedWidgets.length > 0) {
        toast.error("Validation Failed", { description: "All widgets must be mapped to a variable." });
        return;
    }

    // Only require switch nodes to have widgets (sensors are optional displays)
    const requiredNodes = nodes.filter(n => n.data.type === 'switch');
    const mappedIds = new Set(widgets.map(w => w.variable_mapping));
    const missingNodes = requiredNodes.filter(n => !mappedIds.has(n.id));

    if (missingNodes.length > 0) {
        toast.error("Validation Failed", { 
            description: `You must add widgets for the following output components: ${missingNodes.map(n => n.data.label).join(', ')}` 
        });
        return;
    }

    // Build template - backend now supports all widget types directly
    const template = {
      layout_config: { w: layoutColumns, h: 2 }, 
      controls: widgets.map(w => {
        const control: any = {
          widget_type: w.type,
          label: w.label,
          variable_mapping: w.variable_mapping,
        };
        
        // Add optional display config
        if (w.variant && w.variant !== 'row') control.variant = w.variant;
        if (w.size && w.size !== 'md') control.size = w.size;
        if (w.unit) control.unit = w.unit;
        
        // Slider-specific fields
        if (w.type === 'SLIDER') {
          control.min_value = w.min;
          control.max_value = w.max;
          control.step = w.step;
        }
        
        return control;
      })
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
             {reviewMode ? (
               <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 ml-2">
                 REVIEW
               </span>
             ) : editMode ? (
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
                {isSubmitting ? "Submitting..." : reviewMode ? "Approve Device" : editMode ? "Save Changes" : "Propose Device"}
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
        <div className="w-80 border-r border-border p-4 hidden md:flex flex-col bg-card/30 backdrop-blur-xl overflow-y-auto">
            {/* Auto-Generate Button */}
            <Button
              variant="default"
              className="w-full mb-4 bg-gradient-to-r from-primary to-primary/80"
              onClick={handleAutoGenerate}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Auto-Generate from Topology
            </Button>
            
            <Separator className="mb-4" />
            
            {/* Control Widgets */}
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Control Widgets</h3>
            <div className="grid gap-2 mb-4">
              {CONTROL_WIDGET_TYPES.map(t => (
                <Button
                  key={t.type}
                  variant="outline" 
                  className="h-auto py-3 px-3 justify-start gap-3 border-dashed border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  onClick={() => addWidget(t.type)}
                >
                  <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
                     <t.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="font-medium text-sm">{t.label}</span>
                </Button>
              ))}
            </div>
            
            {/* Sensor Widgets */}
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Sensor Displays</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {SENSOR_WIDGET_TYPES.map(t => (
                <Button
                  key={t.type}
                  variant="outline" 
                  className="h-auto py-3 px-2 flex-col gap-1 border-dashed border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  onClick={() => addWidget(t.type)}
                >
                  <t.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-[10px]">{t.label}</span>
                </Button>
              ))}
            </div>

            <Separator className="my-4" />
            
            {/* Layout Options */}
            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Grid Columns</h3>
            <div className="flex gap-2 mb-4">
              {[1, 2].map(cols => (
                <Button
                  key={cols}
                  variant={layoutColumns === cols ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setLayoutColumns(cols)}
                >
                  {cols}
                </Button>
              ))}
            </div>

            <Separator className="my-4" />

            <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Variable Status</h3>
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
            
            <div className="w-full max-w-[450px] space-y-8 animate-in zoom-in-95 duration-300">
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
                    
                    <CardContent className="p-4 space-y-3">
                        {widgets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                                <Wand2 className="w-8 h-8 mb-3 opacity-30" />
                                <span className="text-sm font-medium">No Controls Added</span>
                                <span className="text-xs opacity-60">Click "Auto-Generate" or add items manually</span>
                            </div>
                        ) : (
                          <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            {/* Square widgets in a grid */}
                            {widgets.filter(w => w.variant === 'square').length > 0 && (
                              <SortableContext 
                                items={widgets.filter(w => w.variant === 'square').map(w => w.id)}
                                strategy={rectSortingStrategy}
                              >
                                <div className={`grid gap-2 ${layoutColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                  {widgets.filter(w => w.variant === 'square').map((widget) => (
                                    <SortableSquareWidget
                                      key={widget.id}
                                      widget={widget}
                                      isSelected={selectedWidgetId === widget.id}
                                      onSelect={() => setSelectedWidgetId(widget.id)}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            )}
                            
                            {/* Row widgets stacked */}
                            {widgets.filter(w => w.variant === 'row').length > 0 && (
                              <SortableContext 
                                items={widgets.filter(w => w.variant === 'row').map(w => w.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {widgets.filter(w => w.variant === 'row').map((widget) => (
                                    <SortableRowWidget
                                      key={widget.id}
                                      widget={widget}
                                      isSelected={selectedWidgetId === widget.id}
                                      onSelect={() => setSelectedWidgetId(widget.id)}
                                      mappedLabel={nodes.find(n => n.id === widget.variable_mapping)?.data.label}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            )}
                          </DndContext>
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
          shadow-2xl pb-8 max-h-[70vh] overflow-y-auto
        `}>
          <div className="p-6">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
            
            {/* Auto Generate Button */}
            <Button
              variant="default"
              className="w-full mb-6 bg-gradient-to-r from-primary to-primary/80"
              onClick={() => {
                handleAutoGenerate();
                setIsAddSheetOpen(false);
              }}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Auto-Generate from Topology
            </Button>
            
            {/* Control Widgets */}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Controls</h4>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {CONTROL_WIDGET_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                  onClick={() => {
                    addWidget(t.type);
                    setIsAddSheetOpen(false);
                  }}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-border bg-card/60 shadow-sm">
                    <t.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Sensor Widgets */}
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sensors</h4>
            <div className="grid grid-cols-5 gap-3">
              {SENSOR_WIDGET_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                  onClick={() => {
                    addWidget(t.type);
                    setIsAddSheetOpen(false);
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-border bg-card/60 shadow-sm">
                    <t.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">
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

                  {/* Layout Options */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                      <div className="space-y-2">
                          <Label className="text-xs">Layout Style</Label>
                          <Select 
                              value={selectedWidget.variant || 'row'} 
                              onValueChange={(val) => updateWidget(selectedWidget.id, { variant: val as WidgetVariant })}
                          >
                              <SelectTrigger className="h-9">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="row">
                                      <div className="flex items-center gap-2">
                                          <Rows3 className="w-3 h-3" />
                                          <span>Row</span>
                                      </div>
                                  </SelectItem>
                                  <SelectItem value="square">
                                      <div className="flex items-center gap-2">
                                          <LayoutGrid className="w-3 h-3" />
                                          <span>Square</span>
                                      </div>
                                  </SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      
                      <div className="space-y-2">
                          <Label className="text-xs">Size</Label>
                          <Select 
                              value={selectedWidget.size || 'md'} 
                              onValueChange={(val) => updateWidget(selectedWidget.id, { size: val as WidgetSize })}
                          >
                              <SelectTrigger className="h-9">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="sm">Small</SelectItem>
                                  <SelectItem value="md">Medium</SelectItem>
                                  <SelectItem value="lg">Large</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  {/* Unit (for sensors) */}
                  {SENSOR_WIDGET_TYPES.some(s => s.type === selectedWidget.type) && (
                      <div className="grid gap-2">
                          <Label>Unit</Label>
                          <Input 
                              value={selectedWidget.unit || ''} 
                              onChange={(e) => updateWidget(selectedWidget.id, { unit: e.target.value })}
                              placeholder="e.g. °C, %, lux"
                          />
                      </div>
                  )}

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
