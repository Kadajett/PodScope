import type { Page, Route } from "@playwright/test";
import { mockDataSourcesResponses, mockHealthResponses } from "../fixtures/mock-responses";

/**
 * Helper to mock API routes with different response scenarios
 */
export class ApiMocker {
  constructor(private page: Page) {}

  /**
   * Mock health check API with a specific status
   */
  async mockHealthCheck(scenario: keyof typeof mockHealthResponses = "healthy") {
    await this.page.route("**/api/health", (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHealthResponses[scenario]),
      });
    });
  }

  /**
   * Mock data sources API
   */
  async mockDataSources(scenario: keyof typeof mockDataSourcesResponses = "healthy") {
    await this.page.route("**/api/config/datasources", (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDataSourcesResponses[scenario]),
      });
    });
  }

  /**
   * Mock Kubernetes APIs
   */
  async mockKubernetesAPIs(responses: {
    namespaces?: unknown;
    pods?: unknown;
    nodes?: unknown;
    events?: unknown;
  }) {
    if (responses.namespaces) {
      await this.page.route("**/api/kubernetes/namespaces", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.namespaces),
        });
      });
    }

    if (responses.pods) {
      await this.page.route("**/api/kubernetes/pods**", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.pods),
        });
      });
    }

    if (responses.nodes) {
      await this.page.route("**/api/kubernetes/nodes", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.nodes),
        });
      });
    }

    if (responses.events) {
      await this.page.route("**/api/kubernetes/events**", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.events),
        });
      });
    }
  }

  /**
   * Mock Prometheus query API
   */
  async mockPrometheusQuery(response: unknown) {
    await this.page.route("**/api/prometheus/query**", (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Mock BullMQ APIs
   */
  async mockBullMQAPIs(responses: { overview?: unknown; queues?: unknown }) {
    if (responses.overview) {
      await this.page.route("**/api/bullmq/overview", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.overview),
        });
      });
    }

    if (responses.queues) {
      await this.page.route("**/api/bullmq/queues**", (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(responses.queues),
        });
      });
    }
  }

  /**
   * Mock API error responses
   */
  async mockAPIError(path: string, status = 500, error = "Internal Server Error") {
    await this.page.route(path, (route: Route) => {
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({ error }),
      });
    });
  }

  /**
   * Clear all mocks
   */
  async clearMocks() {
    await this.page.unroute("**/*");
  }
}

/**
 * Helper to manage localStorage for dashboard configuration
 */
export class StorageHelper {
  constructor(private page: Page) {}

  /**
   * Clear all localStorage - uses addInitScript for better cross-browser compatibility
   */
  async clearStorage() {
    await this.page.context().clearCookies();
    // Use addInitScript to clear storage on next page load
    await this.page.addInitScript(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_e) {
        // Ignore security errors in restricted contexts
      }
    });
  }

  /**
   * Set dashboard configuration in localStorage
   * Uses addInitScript for better reliability across browsers
   */
  async setDashboardConfig(config: { layouts?: unknown; components?: unknown; queries?: unknown }) {
    // Use addInitScript to inject localStorage before page loads
    await this.page.addInitScript((cfg) => {
      try {
        if (cfg.layouts) {
          localStorage.setItem("dashboard-layouts", JSON.stringify(cfg.layouts));
        }
        if (cfg.components) {
          localStorage.setItem("dashboard-components", JSON.stringify(cfg.components));
        }
        if (cfg.queries) {
          localStorage.setItem("query-library", JSON.stringify(cfg.queries));
        }
      } catch (_e) {
        // Ignore security errors
      }
    }, config);
  }

  /**
   * Get dashboard configuration from localStorage
   */
  async getDashboardConfig() {
    try {
      return await this.page.evaluate(() => {
        try {
          return {
            layouts: JSON.parse(localStorage.getItem("dashboard-layouts") || "{}"),
            components: JSON.parse(localStorage.getItem("dashboard-components") || "[]"),
            queries: JSON.parse(localStorage.getItem("query-library") || "[]"),
          };
        } catch (_e) {
          return { layouts: {}, components: [], queries: [] };
        }
      });
    } catch (_e) {
      return { layouts: {}, components: [], queries: [] };
    }
  }

  /**
   * Set up a fresh dashboard with default configuration
   */
  async setupDefaultDashboard() {
    const defaultConfig = {
      layouts: {
        "tab-1": [
          { i: "component-1", x: 0, y: 0, w: 6, h: 4 },
          { i: "component-2", x: 6, y: 0, w: 6, h: 4 },
        ],
      },
      components: [
        {
          id: "component-1",
          type: "PrometheusNodeMetrics",
          tab: "tab-1",
          config: {},
        },
        {
          id: "component-2",
          type: "KubeNodeStatus",
          tab: "tab-1",
          config: {},
        },
      ],
      queries: [
        {
          id: "query-1",
          name: "Node CPU Usage",
          query: 'rate(node_cpu_seconds_total{mode!="idle"}[5m])',
          namespace: "default",
        },
      ],
    };

    await this.setDashboardConfig(defaultConfig);
  }
}

/**
 * Wait helpers for common async operations
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * Wait for React Query to finish loading
   */
  async waitForReactQuery() {
    // Wait for any loading spinners to disappear
    await this.page
      .waitForSelector('[data-testid="loading-spinner"]', {
        state: "hidden",
        timeout: 10000,
      })
      .catch(() => {
        // Ignore if no loading spinner found
      });
  }

  /**
   * Wait for a component to be rendered
   */
  async waitForComponent(componentType: string) {
    await this.page.waitForSelector(`[data-component-type="${componentType}"]`, {
      timeout: 10000,
    });
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for health check to complete (optional - doesn't fail if not called)
   */
  async waitForHealthCheck() {
    try {
      // Wait for the health check API call to complete
      await this.page.waitForResponse((response) => response.url().includes("/api/health"), {
        timeout: 5000,
      });
    } catch {
      // Health check not called or timed out - this is ok
      // Just wait a bit for page to settle
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Dismiss Next.js dev overlay if present
   */
  async dismissNextDevOverlay() {
    try {
      // Close Next.js error overlay if it's present
      const overlay = this.page.locator("[data-nextjs-dialog-overlay]");
      if (await overlay.isVisible({ timeout: 1000 })) {
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(500);
      }
    } catch {
      // No overlay present
    }
  }
}

/**
 * Dashboard interaction helpers
 */
export class DashboardHelper {
  constructor(private page: Page) {}

  /**
   * Enter edit mode
   */
  async enterEditMode() {
    await this.page.click('button:has-text("Edit Layout")');
    await this.page.waitForSelector('[data-testid="exit-edit-mode"]');
  }

  /**
   * Exit edit mode
   */
  async exitEditMode() {
    await this.page.click('[data-testid="exit-edit-mode"]');
    await this.page.waitForSelector('button:has-text("Edit Layout")');
  }

  /**
   * Add a component to the dashboard
   */
  async addComponent(componentType: string) {
    await this.page.click('[data-testid="add-component"]');
    await this.page.click(`[data-component-picker="${componentType}"]`);
    await this.page.waitForSelector(`[data-component-type="${componentType}"]`);
  }

  /**
   * Remove a component from the dashboard
   */
  async removeComponent(componentId: string) {
    await this.page.click(`[data-component-id="${componentId}"] [data-action="remove"]`);
  }

  /**
   * Open component settings
   */
  async openComponentSettings(componentId: string) {
    await this.page.click(`[data-component-id="${componentId}"] [data-action="settings"]`);
    await this.page.waitForSelector('[data-testid="component-settings-dialog"]');
  }

  /**
   * Switch to a specific dashboard tab
   */
  async switchToTab(tabName: string) {
    await this.page.click(`[data-testid="dashboard-tab-${tabName}"]`);
  }

  /**
   * Open settings panel
   */
  async openSettings() {
    await this.page.click('[data-testid="open-settings"]');
    await this.page.waitForSelector('[data-testid="settings-panel"]');
  }
}
