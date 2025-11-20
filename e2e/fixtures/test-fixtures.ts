import { test as base } from "@playwright/test";
import {
	ApiMocker,
	StorageHelper,
	WaitHelper,
	DashboardHelper,
} from "../helpers/test-helpers";

/**
 * Extended test fixtures with helper classes
 */
export const test = base.extend<{
	apiMocker: ApiMocker;
	storageHelper: StorageHelper;
	waitHelper: WaitHelper;
	dashboardHelper: DashboardHelper;
}>({
	apiMocker: async ({ page }, use) => {
		const apiMocker = new ApiMocker(page);
		await use(apiMocker);
	},

	storageHelper: async ({ page, context }, use) => {
		const storageHelper = new StorageHelper(page);

		// Clear context state before each test
		await context.clearCookies();

		// Try to clear storage, but don't fail if it doesn't work
		try {
			// Create a simple data URL page to establish a valid origin
			const dataUrl =
				'data:text/html,<html><body><script>try{localStorage.clear();sessionStorage.clear();}catch(e){}</script></body></html>';
			await page.goto(dataUrl);
			await page.waitForTimeout(100);
		} catch (e) {
			// Ignore errors - storage will be cleared on first real navigation
		}

		await use(storageHelper);
	},

	waitHelper: async ({ page }, use) => {
		const waitHelper = new WaitHelper(page);
		await use(waitHelper);
	},

	dashboardHelper: async ({ page }, use) => {
		const dashboardHelper = new DashboardHelper(page);
		await use(dashboardHelper);
	},
});

export { expect } from "@playwright/test";
