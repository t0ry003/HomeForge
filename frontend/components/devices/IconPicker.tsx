'use client';

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ICON_OPTIONS, getIconComponent } from "@/lib/icons";
import { Input } from "@/components/ui/input";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string; // Allow external styling
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Optimization: Filter options manually
  const filteredOptions = React.useMemo(() => {
    // If no search, show a reasonable default set or all (virtualized ideally, but let's limit)
    const limit = searchQuery ? 200 : 100;
    
    if (!searchQuery) return ICON_OPTIONS.slice(0, limit);
    
    const lower = searchQuery.toLowerCase();
    return ICON_OPTIONS.filter((name) => 
      name.toLowerCase().includes(lower)
    ).slice(0, limit);
  }, [searchQuery]);

  const SelectedIcon = value ? getIconComponent(value) : null;

  const handleSelect = React.useCallback((iconName: string) => {
    onChange(iconName);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[200px] justify-between px-3 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {SelectedIcon ? (
              <>
                <SelectedIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{value}</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <span>Select icon...</span>
              </>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="p-4 pb-0">
           <div className="relative">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search icons..."
               className="pl-8"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>
        
        <div className="p-2">
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="grid grid-cols-6 gap-2 p-4">
                {filteredOptions.length === 0 ? (
                    <div className="col-span-6 flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                        <span className="mb-2">No icons found</span>
                    </div>
                ) : (
                    filteredOptions.map((iconName) => {
                    const Icon = getIconComponent(iconName);
                    if (!Icon) return null;
                    
                    const isSelected = value === iconName;
                    
                    return (
                        <Button
                            key={iconName}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSelect(iconName)}
                            className={cn(
                                "h-10 w-10 rounded-md transition-all hover:scale-110",
                                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
                            )}
                            title={iconName}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="sr-only">{iconName}</span>
                        </Button>
                    );
                    })
                )}
              </div>
            </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
