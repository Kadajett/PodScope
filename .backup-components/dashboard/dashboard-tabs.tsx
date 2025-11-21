"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PageConfig } from "@/config/schema";
import { GridContainer } from "./grid-container";

const ACTIVE_TAB_KEY = "podscope-active-tab";

interface DashboardTabsProps {
  pages: PageConfig[];
  editMode?: boolean;
  onLayoutChange?: (pageId: string, layout: PageConfig["layout"]) => void;
  onContainerSettings?: (containerId: string) => void;
  onContainerRemove?: (pageId: string, containerId: string) => void;
  onAddPage?: () => void;
  onPageChange?: (pageId: string) => void;
  onAddComponent?: () => void;
}

export function DashboardTabs({
  pages,
  editMode = false,
  onLayoutChange,
  onContainerSettings,
  onContainerRemove,
  onAddPage,
  onPageChange,
  onAddComponent,
}: DashboardTabsProps) {
  // Load active tab from localStorage
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      if (saved && pages.some((p) => p.id === saved)) {
        return saved;
      }
    }
    return pages[0]?.id || "";
  });

  // Save active tab to localStorage and notify parent
  useEffect(() => {
    if (typeof window !== "undefined" && activeTab) {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
      onPageChange?.(activeTab);
    }
  }, [activeTab, onPageChange]);

  // Ensure active tab is valid
  useEffect(() => {
    if (!pages.some((p) => p.id === activeTab)) {
      const newTab = pages[0]?.id || "";
      setActiveTab(newTab);
    }
  }, [pages, activeTab]);

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No pages configured</p>
          {onAddPage && (
            <Button onClick={onAddPage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 border-b">
        <TabsList>
          {pages.map((page) => (
            <TabsTrigger key={page.id} value={page.id}>
              {page.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {editMode && onAddPage && (
          <Button variant="ghost" size="sm" onClick={onAddPage}>
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {pages.map((page) => (
          <TabsContent
            key={page.id}
            value={page.id}
            className="h-full m-0 data-[state=active]:flex"
          >
            <GridContainer
              layout={page.layout}
              editMode={editMode}
              onLayoutChange={(layout) => onLayoutChange?.(page.id, layout)}
              onContainerSettings={onContainerSettings}
              onContainerRemove={(containerId) => onContainerRemove?.(page.id, containerId)}
            />
          </TabsContent>
        ))}

        {/* Add Component Button (only in edit mode) */}
        {editMode && onAddComponent && (
          <div className="absolute bottom-4 left-4 z-50">
            <Button onClick={onAddComponent}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </div>
        )}
      </div>
    </Tabs>
  );
}
