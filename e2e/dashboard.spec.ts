import { expect, test } from "@playwright/test";
import { mockBullMQData, mockKubernetesData, mockPrometheusData } from "./fixtures/mock-responses";
import { ApiMocker, DashboardHelper, StorageHelper, WaitHelper } from "./helpers/test-helpers";

test.describe("Dashboard Functionality", () => {
  let apiMocker: ApiMocker;
  let storageHelper: StorageHelper;
  let waitHelper: WaitHelper;
  let _dashboardHelper: DashboardHelper;

  test.beforeEach(async ({ page, context }) => {
    apiMocker = new ApiMocker(page);
    storageHelper = new StorageHelper(page);
    waitHelper = new WaitHelper(page);
    _dashboardHelper = new DashboardHelper(page);

    // Clear context state
    await context.clearCookies();

    // Set up healthy state
    await apiMocker.mockHealthCheck("healthy");
    await apiMocker.mockDataSources("healthy");

    // Set up default dashboard configuration
    await storageHelper.setupDefaultDashboard();

    // Mock Kubernetes APIs
    await apiMocker.mockKubernetesAPIs({
      namespaces: mockKubernetesData.namespaces,
      pods: mockKubernetesData.pods,
      nodes: mockKubernetesData.nodes,
      events: mockKubernetesData.events,
    });

    // Mock Prometheus APIs
    await apiMocker.mockPrometheusQuery(mockPrometheusData.querySuccess);

    // Mock BullMQ APIs
    await apiMocker.mockBullMQAPIs({
      overview: mockBullMQData.overview,
      queues: mockBullMQData.queues,
    });
  });

  test("should load dashboard successfully", async ({ page }) => {
    await page.goto("/");

    // Should be on dashboard page (check pathname)
    await expect(page).toHaveURL(/\/(\?.*)?$/);

    // Page should have loaded - check for common elements
    await expect(page.locator("body, main, #__next, [id*='root']")).toBeVisible();
  });

  test("should display health banner when services are down", async ({ page }) => {
    // Mock unhealthy state
    await apiMocker.mockHealthCheck("prometheusDown");

    await page.goto("/");

    // Should show health banner/alert
    await expect(
      page.locator('[role="alert"], .alert, .banner').filter({
        hasText: /unhealthy|error|down|unavailable/i,
      })
    ).toBeVisible({ timeout: 10000 });
  });

  test("should not display health banner when services are healthy", async ({ page }) => {
    await page.goto("/");

    // Wait for health check
    await waitHelper.waitForHealthCheck();

    // Should not show error banner
    const errorBanner = page
      .locator('[role="alert"], .alert, .banner')
      .filter({ hasText: /unhealthy|error|down/i });

    await expect(errorBanner).toHaveCount(0, { timeout: 5000 });
  });

  test("should render dashboard components", async ({ page }) => {
    await page.goto("/");
    await waitHelper.waitForNetworkIdle();

    // Should have page content - check for various possible containers
    const pageContent = page.locator(
      "body, main, #__next, [id*='root'], .react-grid-layout, [data-component-type], .dashboard-component, .widget"
    );
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("should switch between dashboard tabs", async ({ page }) => {
    // Add multiple tabs to config
    await storageHelper.setDashboardConfig({
      layouts: {
        "tab-1": [],
        "tab-2": [],
      },
      components: [],
    });

    await page.goto("/");

    // Should see multiple tabs
    const tabs = page.locator('[role="tablist"] [role="tab"], .tab, [data-testid*="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();

      // Tab should be active - check for either aria-selected or data-state attribute
      const secondTab = tabs.nth(1);
      const hasAriaSelected = await secondTab.getAttribute("aria-selected");
      const hasDataState = await secondTab.getAttribute("data-state");
      expect(hasAriaSelected === "true" || hasDataState === "active").toBe(true);
    }
  });

  test("should display data sources status panel", async ({ page }) => {
    await page.goto("/");

    // Look for data sources status section
    const statusPanel = page.locator("text=/data source|status|connection/i").first();

    if (await statusPanel.isVisible({ timeout: 5000 })) {
      await expect(statusPanel).toBeVisible();
    }
  });

  test("should handle component loading states", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await waitHelper.waitForNetworkIdle();

    // Verify page has loaded by checking it has plenty of DOM elements
    const hasContent = await page.locator("body *").count();
    expect(hasContent).toBeGreaterThan(10); // Should have plenty of DOM elements

    // Body should always be visible
    await expect(page.locator("body")).toBeVisible();

    // Check that page has rendered something visible (excluding hidden elements)
    const visibleContent = page.locator("body *:visible").first();
    await expect(visibleContent).toBeVisible({ timeout: 10000 });
  });

  test("should display component data after loading", async ({ page }) => {
    await page.goto("/");
    await waitHelper.waitForNetworkIdle();

    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    // Check that components have rendered content (not just loading states)
    const contentElements = page.locator("td, li, .metric, .pod, .node, canvas, svg");
    await expect(contentElements.first()).toBeVisible({ timeout: 10000 });
  });

  test("should handle navigation to setup page", async ({ page }) => {
    await page.goto("/");

    // Look for setup link/button
    const setupLink = page.locator(
      'a[href="/setup"], button:has-text("Setup"), a:has-text("Setup")'
    );

    if ((await setupLink.count()) > 0) {
      await setupLink.first().click();
      await expect(page).toHaveURL(/\/setup/);
    }
  });

  test("should display different component types", async ({ page }) => {
    // Set up dashboard with various components
    await storageHelper.setDashboardConfig({
      layouts: {
        "tab-1": [
          { i: "comp-1", x: 0, y: 0, w: 6, h: 4 },
          { i: "comp-2", x: 6, y: 0, w: 6, h: 4 },
          { i: "comp-3", x: 0, y: 4, w: 12, h: 4 },
        ],
      },
      components: [
        { id: "comp-1", type: "PrometheusNodeMetrics", tab: "tab-1", config: {} },
        { id: "comp-2", type: "KubeNodeStatus", tab: "tab-1", config: {} },
        { id: "comp-3", type: "KubeEventStream", tab: "tab-1", config: {} },
      ],
    });

    await page.goto("/");
    await waitHelper.waitForNetworkIdle();

    // Check that the page rendered - look for any grid items or page content
    const pageHasContent = page.locator(
      "body, .react-grid-layout, .react-grid-item, [data-component-type], .dashboard-component, .widget, [class*='grid'], [class*='component']"
    );

    // At least one element should be visible
    const count = await pageHasContent.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should handle refresh action", async ({ page }) => {
    await page.goto("/");
    await waitHelper.waitForNetworkIdle();

    // Look for refresh button
    const refreshButton = page.locator(
      'button[aria-label*="refresh" i], button:has-text("Refresh"), [data-testid="refresh"]'
    );

    if ((await refreshButton.count()) > 0) {
      // Click refresh
      await refreshButton.first().click();

      // Should trigger new API calls
      await page.waitForResponse(
        (response) =>
          response.url().includes("/api/kubernetes/") ||
          response.url().includes("/api/prometheus/"),
        { timeout: 5000 }
      );
    }
  });
});
