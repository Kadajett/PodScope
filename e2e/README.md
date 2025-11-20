# E2E Tests for PodScope

This directory contains end-to-end tests for PodScope using Playwright.

## Overview

The test suite covers:

1. **Setup Flow** - Various data source configuration scenarios
2. **Dashboard Functionality** - Component rendering, navigation, and interaction
3. **Edit Mode** - Layout management, component addition/removal, and configuration
4. **Error Handling** - Graceful degradation and error recovery

## Test Structure

```
e2e/
├── fixtures/
│   └── mock-responses.ts       # Mock API responses for different scenarios
├── helpers/
│   └── test-helpers.ts         # Reusable helper classes and utilities
├── setup-flow.spec.ts          # Tests for setup page and health checks
├── dashboard.spec.ts           # Tests for main dashboard functionality
├── edit-mode.spec.ts           # Tests for edit mode and layout management
├── error-handling.spec.ts      # Tests for error states and recovery
└── README.md                   # This file
```

## Setup Scenarios Covered

The tests simulate different deployment and configuration states:

### Data Source States

1. **Healthy** - All services (Kubernetes, Prometheus, Redis) operational
2. **Degraded** - Critical services up, optional services not configured
3. **Kubernetes Down** - Kubernetes API unavailable
4. **Prometheus Down** - Prometheus API unavailable
5. **All Down** - All critical services unavailable

### Test Coverage

- Initial setup wizard flow
- Health check execution and display
- Service status indicators
- Error message presentation
- Recovery and retry mechanisms
- Dashboard navigation with various states
- Component rendering with different data states
- Layout persistence across sessions
- Configuration export/import

## Running Tests

### Prerequisites

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

### Run All Tests

```bash
# Run all e2e tests headlessly
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

### Run Specific Test Files

```bash
# Run only setup flow tests
npx playwright test setup-flow

# Run only dashboard tests
npx playwright test dashboard

# Run only edit mode tests
npx playwright test edit-mode

# Run only error handling tests
npx playwright test error-handling
```

### Run Specific Browsers

```bash
# Run on Chromium only
npx playwright test --project=chromium

# Run on Firefox only
npx playwright test --project=firefox

# Run on WebKit only
npx playwright test --project=webkit
```

### View Test Reports

```bash
# Show last test report
npm run test:e2e:report
```

## Helper Classes

### ApiMocker

Provides methods to mock API responses with different scenarios:

```typescript
const apiMocker = new ApiMocker(page);

// Mock healthy state
await apiMocker.mockHealthCheck("healthy");

// Mock degraded state
await apiMocker.mockHealthCheck("degraded");

// Mock Kubernetes APIs
await apiMocker.mockKubernetesAPIs({
  namespaces: mockData.namespaces,
  pods: mockData.pods,
});

// Mock API errors
await apiMocker.mockAPIError("**/api/kubernetes/pods**", 500, "Error message");
```

### StorageHelper

Manages localStorage for dashboard configuration:

```typescript
const storageHelper = new StorageHelper(page);

// Clear all storage
await storageHelper.clearStorage();

// Set up default dashboard
await storageHelper.setupDefaultDashboard();

// Get current config
const config = await storageHelper.getDashboardConfig();
```

### WaitHelper

Provides utilities for waiting on async operations:

```typescript
const waitHelper = new WaitHelper(page);

// Wait for React Query to finish
await waitHelper.waitForReactQuery();

// Wait for health check
await waitHelper.waitForHealthCheck();

// Wait for network idle
await waitHelper.waitForNetworkIdle();
```

### DashboardHelper

Handles dashboard-specific interactions:

```typescript
const dashboardHelper = new DashboardHelper(page);

// Enter/exit edit mode
await dashboardHelper.enterEditMode();
await dashboardHelper.exitEditMode();

// Add component
await dashboardHelper.addComponent("PrometheusNodeMetrics");

// Switch tabs
await dashboardHelper.switchToTab("tab-2");
```

## Writing New Tests

### Test Template

```typescript
import { test, expect } from "@playwright/test";
import { ApiMocker, StorageHelper, WaitHelper } from "./helpers/test-helpers";

test.describe("My Feature", () => {
  let apiMocker: ApiMocker;
  let storageHelper: StorageHelper;
  let waitHelper: WaitHelper;

  test.beforeEach(async ({ page }) => {
    apiMocker = new ApiMocker(page);
    storageHelper = new StorageHelper(page);
    waitHelper = new WaitHelper(page);

    // Set up initial state
    await apiMocker.mockHealthCheck("healthy");
    await storageHelper.setupDefaultDashboard();
  });

  test("should do something", async ({ page }) => {
    await page.goto("/");

    // Your test logic here
    await expect(page.locator("selector")).toBeVisible();
  });
});
```

### Best Practices

1. **Use Mock Data** - Always mock API responses for consistent, fast tests
2. **Clean State** - Clear localStorage and cookies before each test
3. **Wait Appropriately** - Use helper methods instead of arbitrary timeouts
4. **Flexible Selectors** - Tests use flexible selectors to handle UI changes
5. **Test Isolation** - Each test should be independent and idempotent
6. **Error Tolerance** - Tests handle optional UI elements gracefully

### Adding Mock Data

To add new mock responses, edit `fixtures/mock-responses.ts`:

```typescript
export const mockNewFeatureData = {
  success: {
    // Your mock data
  },
  error: {
    // Error state mock data
  },
};
```

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

See `.github/workflows/e2e-tests.yml` for workflow configuration.

### Environment Variables

You can configure test behavior with environment variables:

```bash
# Use a different base URL
BASE_URL=http://localhost:4000 npm run test:e2e

# Run in CI mode (affects retry behavior)
CI=true npm run test:e2e
```

## Debugging Tests

### Debug Mode

```bash
# Opens Playwright Inspector
npm run test:e2e:debug
```

### UI Mode

```bash
# Interactive test runner with time-travel debugging
npm run test:e2e:ui
```

### Screenshots and Videos

On failure, Playwright automatically captures:
- Screenshots (`test-results/` directory)
- Traces (viewable with `npx playwright show-trace`)

### Console Logging

Add logging to tests for debugging:

```typescript
test("my test", async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto("/");
});
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in `playwright.config.ts`
- Use appropriate wait helpers instead of fixed timeouts
- Check if API mocks are set up correctly

### Flaky Tests

- Ensure proper wait conditions
- Check for race conditions in component loading
- Use `test.describe.serial()` for dependent tests

### Selector Not Found

- Update selectors in test to match current UI
- Use more flexible selectors (role-based, text-based)
- Check if element is conditionally rendered

### Mocks Not Working

- Verify route patterns match actual API calls
- Check route is set up before navigation
- Use `page.route()` debug logging

## Future Enhancements

Potential additions to the test suite:

- Component-specific interaction tests (kubectl terminal, query editor)
- Performance testing (load times, data refresh)
- Accessibility testing (WCAG compliance)
- Mobile/responsive layout tests
- Multi-tab synchronization tests
- Real-time update tests (WebSocket/polling)
- Configuration migration tests
- Browser compatibility edge cases

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Runners](https://playwright.dev/docs/test-runners)
- [Debugging Tests](https://playwright.dev/docs/debug)
