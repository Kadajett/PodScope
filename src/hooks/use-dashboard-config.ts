"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContainerConfig, DashboardConfig, PageConfig } from "@/config/schema";
import {
  downloadConfig,
  exportConfig,
  importConfig,
  importConfigFromFile,
  loadConfig,
  resetToDefaults,
  saveConfig,
} from "@/lib/config-storage";
import log from "@/lib/logger-client";

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load config on mount
  useEffect(() => {
    try {
      const loadedConfig = loadConfig();
      setConfig(loadedConfig);
    } catch (error) {
      log.error({ error }, "Failed to load config");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save config whenever it changes
  const persistConfig = useCallback((newConfig: DashboardConfig) => {
    try {
      saveConfig(newConfig);
      setConfig(newConfig);
    } catch (error) {
      log.error({ error }, "Failed to save config");
      throw error;
    }
  }, []);

  // Update entire config
  const updateConfig = useCallback(
    (updates: Partial<DashboardConfig>) => {
      if (!config) return;
      const newConfig = { ...config, ...updates };
      persistConfig(newConfig);
    },
    [config, persistConfig]
  );

  // Update a single page
  const updatePage = useCallback(
    (pageId: string, updates: Partial<PageConfig>) => {
      if (!config) return;

      const pageIndex = config.pages.findIndex((p) => p.id === pageId);
      if (pageIndex === -1) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const newPages = [...config.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], ...updates };

      persistConfig({ ...config, pages: newPages });
    },
    [config, persistConfig]
  );

  // Update page layout (for drag-and-drop)
  const updatePageLayout = useCallback(
    (pageId: string, layout: ContainerConfig[]) => {
      updatePage(pageId, { layout });
    },
    [updatePage]
  );

  // Add a new page
  const addPage = useCallback(
    (page: PageConfig) => {
      if (!config) return;
      const newPages = [...config.pages, page];
      persistConfig({ ...config, pages: newPages });
    },
    [config, persistConfig]
  );

  // Delete a page
  const deletePage = useCallback(
    (pageId: string) => {
      if (!config) return;

      if (config.pages.length <= 1) {
        throw new Error("Cannot delete the last page");
      }

      const newPages = config.pages.filter((p) => p.id !== pageId);
      persistConfig({ ...config, pages: newPages });
    },
    [config, persistConfig]
  );

  // Add a container to a page
  const addContainer = useCallback(
    (pageId: string, container: ContainerConfig) => {
      if (!config) return;

      const page = config.pages.find((p) => p.id === pageId);
      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const newLayout = [...page.layout, container];
      updatePageLayout(pageId, newLayout);
    },
    [config, updatePageLayout]
  );

  // Remove a container from a page
  const removeContainer = useCallback(
    (pageId: string, containerId: string) => {
      if (!config) return;

      const page = config.pages.find((p) => p.id === pageId);
      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const newLayout = page.layout.filter((c) => c.i !== containerId);
      updatePageLayout(pageId, newLayout);
    },
    [config, updatePageLayout]
  );

  // Update a container's config
  const updateContainer = useCallback(
    (pageId: string, containerId: string, updates: Partial<ContainerConfig>) => {
      if (!config) return;

      const page = config.pages.find((p) => p.id === pageId);
      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }

      const containerIndex = page.layout.findIndex((c) => c.i === containerId);
      if (containerIndex === -1) {
        throw new Error(`Container not found: ${containerId}`);
      }

      const newLayout = [...page.layout];
      newLayout[containerIndex] = { ...newLayout[containerIndex], ...updates };
      updatePageLayout(pageId, newLayout);
    },
    [config, updatePageLayout]
  );

  // Reset to default configuration
  const reset = useCallback(() => {
    const defaultConfig = resetToDefaults();
    setConfig(defaultConfig);
  }, []);

  // Export configuration
  const exportConfigJSON = useCallback(() => {
    return exportConfig();
  }, []);

  // Download configuration as file
  const download = useCallback(() => {
    downloadConfig();
  }, []);

  // Import configuration from JSON string
  const importConfigJSON = useCallback((jsonString: string) => {
    const result = importConfig(jsonString);
    if (result.success) {
      const newConfig = loadConfig();
      setConfig(newConfig);
    }
    return result;
  }, []);

  // Import configuration from file
  const importFromFile = useCallback(async (file: File) => {
    const result = await importConfigFromFile(file);
    if (result.success) {
      const newConfig = loadConfig();
      setConfig(newConfig);
    }
    return result;
  }, []);

  return {
    config,
    isLoading,
    updateConfig,
    updatePage,
    updatePageLayout,
    addPage,
    deletePage,
    addContainer,
    removeContainer,
    updateContainer,
    reset,
    exportConfig: exportConfigJSON,
    downloadConfig: download,
    importConfig: importConfigJSON,
    importFromFile,
  };
}
