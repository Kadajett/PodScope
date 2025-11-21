"use client";

import { Activity, Container, ListOrdered, type LucideIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ComponentMetadata, getComponentsByCategory } from "@/config/component-registry";

interface ComponentPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectComponent: (componentName: string, defaultConfig: Record<string, unknown>) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Activity: Activity,
  Container: Container,
  ListOrdered: ListOrdered,
};

export function ComponentPicker({ open, onOpenChange, onSelectComponent }: ComponentPickerProps) {
  const componentsByCategory = getComponentsByCategory();

  const handleSelect = (metadata: ComponentMetadata) => {
    onSelectComponent(metadata.name, metadata.defaultConfig || {});
    onOpenChange(false);
  };

  const renderComponentCard = (metadata: ComponentMetadata) => {
    const Icon = ICON_MAP[metadata.icon] || Activity;

    return (
      <Card
        key={metadata.name}
        className="cursor-pointer hover:border-primary transition-colors"
        onClick={() => handleSelect(metadata)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{metadata.displayName}</CardTitle>
                <CardDescription className="text-sm mt-1">{metadata.description}</CardDescription>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">
              {metadata.category}
            </Badge>
            {metadata.defaultSize && (
              <Badge variant="outline" className="text-xs">
                {metadata.defaultSize.w}x{metadata.defaultSize.h}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
          <DialogDescription>Choose a component to add to your dashboard</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="prometheus">Prometheus</TabsTrigger>
            <TabsTrigger value="kubernetes">Kubernetes</TabsTrigger>
            <TabsTrigger value="bullmq">BullMQ</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="all" className="space-y-3 m-0">
              {Object.values(componentsByCategory).flat().map(renderComponentCard)}
            </TabsContent>

            <TabsContent value="prometheus" className="space-y-3 m-0">
              {componentsByCategory.prometheus.length > 0 ? (
                componentsByCategory.prometheus.map(renderComponentCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No Prometheus components available
                </div>
              )}
            </TabsContent>

            <TabsContent value="kubernetes" className="space-y-3 m-0">
              {componentsByCategory.kubernetes.length > 0 ? (
                componentsByCategory.kubernetes.map(renderComponentCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No Kubernetes components available
                </div>
              )}
            </TabsContent>

            <TabsContent value="bullmq" className="space-y-3 m-0">
              {componentsByCategory.bullmq.length > 0 ? (
                componentsByCategory.bullmq.map(renderComponentCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No BullMQ components available
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-3 m-0">
              {componentsByCategory.custom.length > 0 ? (
                componentsByCategory.custom.map(renderComponentCard)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No custom components available
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
