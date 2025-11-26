import defaultDashboard from "@/config/default-dashboard.json";
import { type DashboardConfig, DashboardConfigSchema, type QueryLibrary } from "@/config/schema";
import log from "@/lib/logger-client";

const STORAGE_KEY = "podscope-dashboard-config";
const USER_QUERIES_KEY = "podscope-user-queries";
const CONFIG_HISTORY_KEY = "podscope-config-history";
const MAX_HISTORY_ENTRIES = 20;

// Config history types
export interface ConfigSnapshot {
  id: string;
  timestamp: string;
  label?: string;
  config: DashboardConfig;
  changeType: "import" | "edit" | "template" | "reset" | "manual";
}

export interface ConfigHistory {
  snapshots: ConfigSnapshot[];
  currentIndex: number; // Index of current active config in history
}

/**
 * Deep merge two objects, with source overriding target
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Load dashboard configuration
 * Merges default config with localStorage overrides
 */
export function loadConfig(): DashboardConfig {
  try {
    // Start with default config
    let config = defaultDashboard as DashboardConfig;

    // Try to load from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate with Zod
        const validated = DashboardConfigSchema.parse(parsed);
        config = validated;
      }
    }

    // Load user-defined queries and merge them
    const userQueries = loadUserQueries();
    if (Object.keys(userQueries).length > 0) {
      config = {
        ...config,
        queries: deepMerge(config.queries, userQueries),
      };
    }

    return config;
  } catch (error) {
    log.error({ error }, "Failed to load dashboard config");
    // Return default config on error
    return defaultDashboard as DashboardConfig;
  }
}

/**
 * Save dashboard configuration to localStorage
 */
export function saveConfig(config: DashboardConfig): void {
  try {
    // Validate before saving
    const validated = DashboardConfigSchema.parse(config);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated, null, 2));
    }
  } catch (error) {
    log.error({ error }, "Failed to save dashboard config");
    throw new Error(
      `Invalid configuration: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Load user-defined queries from localStorage
 * These are queries added/modified by the user via the settings panel
 */
export function loadUserQueries(): QueryLibrary {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(USER_QUERIES_KEY);
      if (stored) {
        return JSON.parse(stored) as QueryLibrary;
      }
    }
    return {};
  } catch (error) {
    log.error({ error }, "Failed to load user queries");
    return {};
  }
}

/**
 * Save user-defined queries to localStorage
 */
export function saveUserQueries(queries: QueryLibrary): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_QUERIES_KEY, JSON.stringify(queries, null, 2));
    }
  } catch (error) {
    log.error({ error }, "Failed to save user queries");
    throw new Error("Failed to save user queries");
  }
}

/**
 * Add or update a single user query
 */
export function saveUserQuery(namespace: string, queryName: string, promQL: string): void {
  const userQueries = loadUserQueries();

  if (!userQueries[namespace]) {
    userQueries[namespace] = {};
  }

  userQueries[namespace][queryName] = promQL;
  saveUserQueries(userQueries);
}

/**
 * Delete a user query
 */
export function deleteUserQuery(namespace: string, queryName: string): void {
  const userQueries = loadUserQueries();

  if (userQueries[namespace]) {
    delete userQueries[namespace][queryName];

    // Remove namespace if empty
    if (Object.keys(userQueries[namespace]).length === 0) {
      delete userQueries[namespace];
    }

    saveUserQueries(userQueries);
  }
}

/**
 * Export configuration as JSON string
 */
export function exportConfig(): string {
  const config = loadConfig();
  return JSON.stringify(config, null, 2);
}

/**
 * Export configuration as downloadable file
 */
export function downloadConfig(): void {
  const json = exportConfig();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-config-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import configuration from JSON string
 * Validates and saves to localStorage
 */
export function importConfig(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const validated = DashboardConfigSchema.parse(parsed);
    saveConfig(validated);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

/**
 * Import configuration from file upload
 */
export function importConfigFromFile(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = importConfig(content);
        resolve(result);
      } catch (_error) {
        resolve({
          success: false,
          error: "Failed to read file",
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: "Failed to read file",
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Reset configuration to defaults
 * Clears localStorage and returns default config
 */
export function resetToDefaults(): DashboardConfig {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_QUERIES_KEY);
  }
  return defaultDashboard as DashboardConfig;
}

/**
 * Update a single page in the configuration
 */
export function updatePage(pageId: string, updates: Partial<DashboardConfig["pages"][0]>): void {
  const config = loadConfig();
  const pageIndex = config.pages.findIndex((p) => p.id === pageId);

  if (pageIndex === -1) {
    throw new Error(`Page not found: ${pageId}`);
  }

  config.pages[pageIndex] = {
    ...config.pages[pageIndex],
    ...updates,
  };

  saveConfig(config);
}

/**
 * Add a new page to the configuration
 */
export function addPage(page: DashboardConfig["pages"][0]): void {
  const config = loadConfig();
  config.pages.push(page);
  saveConfig(config);
}

/**
 * Delete a page from the configuration
 */
export function deletePage(pageId: string): void {
  const config = loadConfig();

  if (config.pages.length <= 1) {
    throw new Error("Cannot delete the last page");
  }

  config.pages = config.pages.filter((p) => p.id !== pageId);
  saveConfig(config);
}

// ============================================
// Config History Management
// ============================================

function generateSnapshotId(): string {
  return `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load config history from localStorage
 */
export function loadConfigHistory(): ConfigHistory {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(CONFIG_HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored) as ConfigHistory;
      }
    }
    return { snapshots: [], currentIndex: -1 };
  } catch (error) {
    log.error({ error }, "Failed to load config history");
    return { snapshots: [], currentIndex: -1 };
  }
}

/**
 * Save config history to localStorage
 */
function saveConfigHistory(history: ConfigHistory): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    log.error({ error }, "Failed to save config history");
  }
}

/**
 * Create a snapshot of the current config and add to history
 */
export function createConfigSnapshot(
  changeType: ConfigSnapshot["changeType"],
  label?: string
): ConfigSnapshot {
  const config = loadConfig();
  const history = loadConfigHistory();

  const snapshot: ConfigSnapshot = {
    id: generateSnapshotId(),
    timestamp: new Date().toISOString(),
    label: label || getDefaultLabel(changeType),
    config,
    changeType,
  };

  // If we're not at the end of history, remove future snapshots
  if (history.currentIndex >= 0 && history.currentIndex < history.snapshots.length - 1) {
    history.snapshots = history.snapshots.slice(0, history.currentIndex + 1);
  }

  // Add new snapshot
  history.snapshots.push(snapshot);

  // Limit history size
  if (history.snapshots.length > MAX_HISTORY_ENTRIES) {
    history.snapshots = history.snapshots.slice(-MAX_HISTORY_ENTRIES);
  }

  // Update current index to point to the new snapshot
  history.currentIndex = history.snapshots.length - 1;

  saveConfigHistory(history);
  return snapshot;
}

function getDefaultLabel(changeType: ConfigSnapshot["changeType"]): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  switch (changeType) {
    case "import":
      return `Imported config - ${dateStr} ${timeStr}`;
    case "template":
      return `Applied template - ${dateStr} ${timeStr}`;
    case "reset":
      return `Reset to defaults - ${dateStr} ${timeStr}`;
    case "manual":
      return `Manual save - ${dateStr} ${timeStr}`;
    default:
      return `Config edit - ${dateStr} ${timeStr}`;
  }
}

/**
 * Restore config from a specific snapshot
 */
export function restoreFromSnapshot(snapshotId: string): { success: boolean; error?: string } {
  try {
    const history = loadConfigHistory();
    const snapshotIndex = history.snapshots.findIndex((s) => s.id === snapshotId);

    if (snapshotIndex === -1) {
      return { success: false, error: "Snapshot not found" };
    }

    const snapshot = history.snapshots[snapshotIndex];

    // Validate and save the config
    const validated = DashboardConfigSchema.parse(snapshot.config);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated, null, 2));
    }

    // Update current index
    history.currentIndex = snapshotIndex;
    saveConfigHistory(history);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore snapshot",
    };
  }
}

/**
 * Undo to previous config state
 */
export function undoConfig(): { success: boolean; snapshot?: ConfigSnapshot; error?: string } {
  const history = loadConfigHistory();

  if (history.currentIndex <= 0) {
    return { success: false, error: "No previous state to undo to" };
  }

  const previousIndex = history.currentIndex - 1;
  const previousSnapshot = history.snapshots[previousIndex];

  const result = restoreFromSnapshot(previousSnapshot.id);
  if (result.success) {
    return { success: true, snapshot: previousSnapshot };
  }

  return result;
}

/**
 * Redo to next config state
 */
export function redoConfig(): { success: boolean; snapshot?: ConfigSnapshot; error?: string } {
  const history = loadConfigHistory();

  if (history.currentIndex >= history.snapshots.length - 1) {
    return { success: false, error: "No future state to redo to" };
  }

  const nextIndex = history.currentIndex + 1;
  const nextSnapshot = history.snapshots[nextIndex];

  const result = restoreFromSnapshot(nextSnapshot.id);
  if (result.success) {
    return { success: true, snapshot: nextSnapshot };
  }

  return result;
}

/**
 * Get the current snapshot from history
 */
export function getCurrentSnapshot(): ConfigSnapshot | null {
  const history = loadConfigHistory();
  if (history.currentIndex >= 0 && history.currentIndex < history.snapshots.length) {
    return history.snapshots[history.currentIndex];
  }
  return null;
}

/**
 * Check if undo is available
 */
export function canUndo(): boolean {
  const history = loadConfigHistory();
  return history.currentIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(): boolean {
  const history = loadConfigHistory();
  return history.currentIndex < history.snapshots.length - 1;
}

/**
 * Delete a specific snapshot from history
 */
export function deleteSnapshot(snapshotId: string): { success: boolean; error?: string } {
  try {
    const history = loadConfigHistory();
    const snapshotIndex = history.snapshots.findIndex((s) => s.id === snapshotId);

    if (snapshotIndex === -1) {
      return { success: false, error: "Snapshot not found" };
    }

    // Don't allow deleting the current snapshot
    if (snapshotIndex === history.currentIndex) {
      return { success: false, error: "Cannot delete the current active snapshot" };
    }

    history.snapshots.splice(snapshotIndex, 1);

    // Adjust current index if needed
    if (snapshotIndex < history.currentIndex) {
      history.currentIndex--;
    }

    saveConfigHistory(history);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete snapshot",
    };
  }
}

/**
 * Clear all config history
 */
export function clearConfigHistory(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONFIG_HISTORY_KEY);
  }
}

/**
 * Save config with automatic snapshot creation
 * Use this instead of saveConfig when you want history tracking
 */
export function saveConfigWithHistory(
  config: DashboardConfig,
  changeType: ConfigSnapshot["changeType"] = "edit",
  label?: string
): void {
  saveConfig(config);
  createConfigSnapshot(changeType, label);
}

/**
 * Import config with history tracking
 */
export function importConfigWithHistory(
  jsonString: string,
  label?: string
): { success: boolean; error?: string } {
  const result = importConfig(jsonString);
  if (result.success) {
    createConfigSnapshot("import", label);
  }
  return result;
}

/**
 * Reset to defaults with history tracking
 */
export function resetToDefaultsWithHistory(): DashboardConfig {
  // Create snapshot before reset
  createConfigSnapshot("manual", "Before reset to defaults");
  const config = resetToDefaults();
  createConfigSnapshot("reset", "Reset to defaults");
  return config;
}

/**
 * Export config snapshot for external storage (save as template file)
 */
export function exportAsTemplate(name: string, description: string): string {
  const config = loadConfig();
  const template = {
    name,
    description,
    exportedAt: new Date().toISOString(),
    version: config.version,
    config,
  };
  return JSON.stringify(template, null, 2);
}

/**
 * Download current config as a named template file
 */
export function downloadAsTemplate(name: string, description: string): void {
  const json = exportAsTemplate(name, description);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const a = document.createElement("a");
  a.href = url;
  a.download = `podscope-template-${sanitizedName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
