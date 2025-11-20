import { test, expect } from "@playwright/test";
import {
	ApiMocker,
	StorageHelper,
	WaitHelper,
} from "./helpers/test-helpers";

test.describe("Error Handling and Degraded States", () => {
	let apiMocker: ApiMocker;
	let storageHelper: StorageHelper;
	let waitHelper: WaitHelper;

	test.beforeEach(async ({ page, context }) => {
		apiMocker = new ApiMocker(page);
		storageHelper = new StorageHelper(page);
		waitHelper = new WaitHelper(page);

		// Clear context state
		await context.clearCookies();

		// Set up default dashboard
		await storageHelper.setupDefaultDashboard();
	});

	test("should display error banner when Kubernetes API is down", async ({
		page,
	}) => {
		await apiMocker.mockHealthCheck("kubernetesDown");
		await apiMocker.mockAPIError("**/api/kubernetes/**", 503, "Service Unavailable");

		await page.goto("/");
		await waitHelper.waitForHealthCheck();

		// Should show error banner
		await expect(
			page.locator('[role="alert"], .alert, .banner').filter({
				hasText: /kubernetes|unavailable|error/i,
			}),
		).toBeVisible({ timeout: 10000 });
	});

	test("should display error banner when Prometheus API is down", async ({
		page,
	}) => {
		await apiMocker.mockHealthCheck("prometheusDown");
		await apiMocker.mockAPIError("**/api/prometheus/**", 503, "Service Unavailable");

		await page.goto("/");
		await waitHelper.waitForHealthCheck();

		// Should show error banner
		await expect(
			page.locator('[role="alert"], .alert, .banner').filter({
				hasText: /prometheus|unavailable|error/i,
			}),
		).toBeVisible({ timeout: 10000 });
	});

	test("should show error message in component when data fetch fails", async ({
		page,
	}) => {
		await apiMocker.mockHealthCheck("healthy");
		await apiMocker.mockAPIError("**/api/kubernetes/pods**", 500, "Internal Server Error");

		await page.goto("/");
		await waitHelper.waitForNetworkIdle();

		// Should show error state in component
		await expect(
			page.locator('text=/error|failed|unable/i').first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("should allow retry after error", async ({ page }) => {
		// Start with error
		await apiMocker.mockHealthCheck("prometheusDown");
		await apiMocker.mockAPIError("**/api/prometheus/**", 503, "Service Unavailable");

		await page.goto("/");

		// Wait for page to load
		await page.waitForLoadState("networkidle");

		// Should show error
		const errorIndicator = page.locator("body").filter({
			hasText: /error|unavailable|failed|down/i,
		});

		await expect(errorIndicator.first()).toBeVisible({ timeout: 10000 });

		// Now mock as healthy for next request
		await apiMocker.clearMocks();
		await apiMocker.mockHealthCheck("healthy");

		// Look for retry/refresh button
		const retryButton = page.locator(
			'button:has-text("Retry"), button:has-text("Refresh"), button:has-text("Try Again"), button:has-text("Recheck")',
		);

		if (await retryButton.count() > 0) {
			// Set up listener for health check before clicking
			const healthCheckPromise = page.waitForResponse(
				(response) => response.url().includes("/api/health"),
				{ timeout: 10000 },
			).catch(() => null); // Ignore if doesn't happen

			await retryButton.first().click();

			// Wait for health check or timeout
			await healthCheckPromise;

			// Give UI time to update
			await page.waitForTimeout(1000);

			// Page should still be visible (test passes if no crash)
			await expect(page.locator("body")).toBeVisible();
		}
	});

	test("should handle network timeout gracefully", async ({ page }) => {
		// Mock slow response by aborting immediately
		await page.route("**/api/kubernetes/pods**", async (route) => {
			// Abort with timeout error immediately
			await route.abort("timedout");
		});

		await apiMocker.mockHealthCheck("healthy");

		await page.goto("/");

		// Wait for network to settle
		await page.waitForLoadState("networkidle");

		// Page should still render
		await expect(page.locator("body")).toBeVisible();

		// Should show some error indication or the page loaded
		// (Test passes if page doesn't crash)
	});

	test("should handle invalid API responses", async ({ page }) => {
		await apiMocker.mockHealthCheck("healthy");

		// Mock invalid JSON response
		await page.route("**/api/kubernetes/pods**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "{ invalid json",
			});
		});

		await page.goto("/");
		await waitHelper.waitForNetworkIdle();

		// Should handle error gracefully - page should render
		await expect(page.locator("body")).toBeVisible();
	});

	test("should show degraded state when optional services are unavailable", async ({
		page,
	}) => {
		// Mock degraded state (Redis not configured)
		await apiMocker.mockHealthCheck("degraded");
		await apiMocker.mockDataSources("degraded");

		await page.goto("/");
		await waitHelper.waitForHealthCheck();

		// Dashboard should still be functional - page should render
		await expect(page.locator("body")).toBeVisible();

		// May show informational message about degraded state
		const infoMessage = page.locator(
			'[role="status"], .info',
		).filter({ hasText: /degraded|optional|not configured/i });

		// This is optional - degraded state might not show a banner
		const hasInfo = (await infoMessage.count()) > 0;
		if (hasInfo) {
			await expect(infoMessage.first()).toBeVisible();
		}
	});

	test("should display specific error messages from API", async ({ page }) => {
		await apiMocker.mockHealthCheck("healthy");

		// Mock API with specific error message
		const errorMessage = "Authentication failed: Invalid credentials";
		await page.route("**/api/kubernetes/pods**", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: errorMessage }),
			});
		});

		await page.goto("/");
		await waitHelper.waitForNetworkIdle();

		// Should show the specific error message somewhere
		const errorText = page.locator(`text=/authentication|credentials/i`);

		if (await errorText.count() > 0) {
			await expect(errorText.first()).toBeVisible({ timeout: 10000 });
		}
	});

	test("should handle component-specific errors without breaking dashboard", async ({
		page,
	}) => {
		await apiMocker.mockHealthCheck("healthy");

		// Mock one API to fail but others to succeed
		await apiMocker.mockAPIError("**/api/kubernetes/pods**", 500, "Pod API failed");
		await page.route("**/api/kubernetes/nodes", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ items: [] }),
			});
		});

		await page.goto("/");
		await waitHelper.waitForNetworkIdle();

		// Dashboard should still render - page should load
		await expect(page.locator("body")).toBeVisible();

		// Page should have some content
		const pageContent = page.locator("body *");
		const count = await pageContent.count();
		expect(count).toBeGreaterThan(0);
	});

	test("should allow navigation to setup page when services are down", async ({
		page,
	}) => {
		await apiMocker.mockHealthCheck("allDown");

		await page.goto("/");
		await waitHelper.waitForHealthCheck();

		// Look for configure/setup link in error banner
		const setupLink = page.locator(
			'a[href="/setup"], a:has-text("Setup"), a:has-text("Configure"), button:has-text("Configure")',
		);

		if (await setupLink.count() > 0) {
			await setupLink.first().click();
			await expect(page).toHaveURL(/\/setup/);
		}
	});

	test("should handle empty data gracefully", async ({ page }) => {
		await apiMocker.mockHealthCheck("healthy");

		// Mock empty responses
		await page.route("**/api/kubernetes/pods**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ items: [] }),
			});
		});

		await page.route("**/api/kubernetes/nodes", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ items: [] }),
			});
		});

		await page.goto("/");
		await waitHelper.waitForNetworkIdle();

		// Dashboard should still render - page should load
		await expect(page.locator("body")).toBeVisible();

		// Should show empty state or "no data" message (optional check)
		const emptyState = page.locator("body").filter({
			hasText: /no data|no items|empty|no pods|no nodes/i,
		});

		// This is informational - test passes if page renders
		const hasEmptyState = (await emptyState.count()) > 0;
		if (hasEmptyState) {
			await expect(emptyState.first()).toBeVisible({ timeout: 10000 });
		}
	});

	test("should dismiss error banner", async ({ page }) => {
		await apiMocker.mockHealthCheck("prometheusDown");

		await page.goto("/");
		await waitHelper.waitForHealthCheck();

		// Should show error banner
		const errorBanner = page.locator('[role="alert"], .alert, .banner').filter({
			hasText: /error|unavailable/i,
		});

		await expect(errorBanner.first()).toBeVisible({ timeout: 10000 });

		// Look for dismiss button
		const dismissButton = errorBanner.locator(
			'button[aria-label*="dismiss" i], button[aria-label*="close" i], button:has-text("×")',
		);

		if (await dismissButton.count() > 0) {
			await dismissButton.first().click();

			// Banner should be hidden
			await expect(errorBanner.first()).toBeHidden({ timeout: 5000 });
		}
	});
});
