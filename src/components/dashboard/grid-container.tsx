"use client";

import { Code2, GripVertical, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import { ComponentErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COMPONENT_REGISTRY } from "@/config/component-registry";
import type { ContainerConfig } from "@/config/schema";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface GridContainerProps {
  layout: ContainerConfig[];
  editMode?: boolean;
  onLayoutChange?: (layout: ContainerConfig[]) => void;
  onContainerSettings?: (containerId: string) => void;
  onContainerRemove?: (containerId: string) => void;
}

export function GridContainer({
  layout,
  editMode = false,
  onLayoutChange,
  onContainerSettings,
  onContainerRemove,
}: GridContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Measure container width and update on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Initial measurement
    updateWidth();

    // Create ResizeObserver to track container size changes
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Convert ContainerConfig to react-grid-layout Layout format
  const gridLayout: Layout[] = useMemo(() => {
    return layout.map((container) => ({
      i: container.i,
      x: container.x,
      y: container.y,
      w: container.w,
      h: container.h,
      minW: container.minW,
      minH: container.minH,
      maxW: container.maxW,
      maxH: container.maxH,
      static: container.static || !editMode,
    }));
  }, [layout, editMode]);

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = (newLayout: Layout[]) => {
    if (!(onLayoutChange && editMode)) return;

    // Merge new layout positions with existing container configs
    const updatedLayout = layout.map((container) => {
      const newPos = newLayout.find((l) => l.i === container.i);
      if (!newPos) return container;

      return {
        ...container,
        x: newPos.x,
        y: newPos.y,
        w: newPos.w,
        h: newPos.h,
      };
    });

    onLayoutChange(updatedLayout);
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-auto">
      <GridLayout
        className="layout"
        layout={gridLayout}
        cols={12}
        rowHeight={100}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
        containerPadding={[16, 16]}
      >
        {layout.map((container) => {
          const ComponentToRender = COMPONENT_REGISTRY[container.component];

          return (
            <div key={container.i} className="relative group">
              <Card className="h-full w-full overflow-hidden flex flex-col">
                {/* Edit Mode Header */}
                {editMode && (
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {container.component}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onContainerSettings && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContainerSettings(container.i);
                                }}
                              >
                                <Code2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Config</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {onContainerRemove && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContainerRemove(container.i);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Edit Button (visible on hover when not in edit mode) */}
                {!editMode && onContainerSettings && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 w-7 p-0 shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              onContainerSettings(container.i);
                            }}
                          >
                            <Code2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Component Config</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Component content */}
                <div className="flex-1 overflow-auto">
                  {ComponentToRender ? (
                    <ComponentErrorBoundary componentName={container.component}>
                      <ComponentToRender {...(container.config || {})} />
                    </ComponentErrorBoundary>
                  ) : (
                    <div className="flex items-center justify-center h-full p-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Component not found: {container.component}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Check your component registry
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
