import defaultDashboard from "@/config/default-dashboard.json";
import { type DashboardConfig, DashboardConfigSchema, type QueryLibrary } from "@/config/schema";
import log from "@/lib/logger-client";

const STORAGE_KEY = "podscope-dashboard-config";
const USER_QUERIES_KEY = "podscope-user-queries";

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
