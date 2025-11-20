"use client";

import { Edit, Save, Settings } from "lucide-react";
import { useState } from "react";
import { ClusterSelectorBar } from "@/components/dashboard/cluster-selector-bar";
import { ComponentPicker } from "@/components/dashboard/component-picker";
import { ConfigEditor } from "@/components/dashboard/config-editor";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { HealthBanner } from "@/components/dashboard/health-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryEditorDialog } from "@/components/dashboard/query-editor-dialog";
import { SettingsPanel } from "@/components/dashboard/settings-panel";
import { Button } from "@/components/ui/button";
import { getComponentMetadata } from "@/config/component-registry";
import type { ContainerConfig } from "@/config/schema";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";

export default function Dashboard() {
  const { config, isLoading, updatePageLayout, removeContainer, addContainer, updateContainer } =
    useDashboardConfig();
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [queryEditorOpen, setQueryEditorOpen] = useState(false);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [configEditorOpen, setConfigEditorOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(config?.pages[0]?.id || "");
  const [editingContainer, setEditingContainer] = useState<ContainerConfig | null>(null);
  const [editingQuery, setEditingQuery] = useState<{
    namespace: string;
    queryName: string;
    promQL: string;
  } | null>(null);

  const handleEditQuery = (namespace: string, queryName: string, promQL: string) => {
    setEditingQuery({ namespace, queryName, promQL });
    setQueryEditorOpen(true);
    setSettingsOpen(false);
  };

  const handleAddQuery = () => {
    setEditingQuery(null);
    setQueryEditorOpen(true);
    setSettingsOpen(false);
  };

  const handleAddComponent = (componentName: string, defaultConfig: Record<string, unknown>) => {
    if (!(currentPage && config)) return;

    const metadata = getComponentMetadata(componentName);
    const defaultSize = metadata?.defaultSize || { w: 6, h: 4 };

    // Generate unique ID
    const newId = `${componentName.toLowerCase()}-${Date.now()}`;

    // Find the current page's layout
    const page = config.pages.find((p) => p.id === currentPage);
    const currentLayout = page?.layout || [];

    // Calculate the y position by finding the max y + height of existing containers
    let maxY = 0;
    currentLayout.forEach((container) => {
      const bottomY = container.y + container.h;
      if (bottomY > maxY) {
        maxY = bottomY;
      }
    });

    // Find a good position (bottom of existing layout)
    const newContainer = {
      i: newId,
      x: 0,
      y: maxY, // Place at the bottom of existing containers
      w: defaultSize.w,
      h: defaultSize.h,
      component: componentName,
      config: defaultConfig,
      minW: metadata?.defaultSize ? Math.floor(metadata.defaultSize.w / 2) : 3,
      minH: metadata?.defaultSize ? Math.floor(metadata.defaultSize.h / 2) : 2,
    };

    addContainer(currentPage, newContainer);
  };

  const handleEditContainer = (containerId: string) => {
    if (!(currentPage && config)) return;

    const page = config.pages.find((p) => p.id === currentPage);
    if (!page) return;

    const container = page.layout.find((c) => c.i === containerId);
    if (!container) return;

    setEditingContainer(container);
    setConfigEditorOpen(true);
  };

  const handleSaveContainer = (updatedContainer: ContainerConfig) => {
    if (!(currentPage && editingContainer)) return;

    updateContainer(currentPage, editingContainer.i, updatedContainer);
    setConfigEditorOpen(false);
    setEditingContainer(null);
  };

  const handleDuplicateContainer = (container: ContainerConfig) => {
    if (!currentPage) return;

    addContainer(currentPage, container);
    setConfigEditorOpen(false);
    setEditingContainer(null);
  };

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Zone 1: Sticky Header */}
      <PageHeader />

      {/* Health Status Banner */}
      <HealthBanner />

      {/* Zone 2: Cluster/Node Selector */}
      <ClusterSelectorBar />

      {/* Zone 3: Configurable Dashboard */}
      <div className="flex-1 overflow-hidden relative">
        <DashboardTabs
          pages={config.pages}
          editMode={editMode}
          onLayoutChange={updatePageLayout}
          onContainerSettings={handleEditContainer}
          onContainerRemove={removeContainer}
          onPageChange={setCurrentPage}
          onAddComponent={() => setComponentPickerOpen(true)}
        />

        {/* Floating Edit Mode Toggle */}
        <div className="absolute bottom-4 right-4 flex gap-2 z-50">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Exit Edit Mode
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit Layout
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onEditQuery={handleEditQuery}
        onAddQuery={handleAddQuery}
      />

      {/* Query Editor Dialog */}
      <QueryEditorDialog
        open={queryEditorOpen}
        onOpenChange={(open) => {
          setQueryEditorOpen(open);
          if (!open && editingQuery) {
            setSettingsOpen(true);
            setEditingQuery(null);
          }
        }}
        namespace={editingQuery?.namespace}
        queryName={editingQuery?.queryName}
        promQL={editingQuery?.promQL}
        mode={editingQuery ? "edit" : "add"}
      />

      {/* Component Picker */}
      <ComponentPicker
        open={componentPickerOpen}
        onOpenChange={setComponentPickerOpen}
        onSelectComponent={handleAddComponent}
      />

      {/* Config Editor */}
      {editingContainer && (
        <ConfigEditor
          open={configEditorOpen}
          onOpenChange={setConfigEditorOpen}
          container={editingContainer}
          onSave={handleSaveContainer}
          onDuplicate={handleDuplicateContainer}
        />
      )}
    </div>
  );
}
