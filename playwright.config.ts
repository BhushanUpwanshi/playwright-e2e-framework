import { defineConfig, devices } from '@playwright/test';
import { BASE_URLS, ENV, TIMEOUTS } from '@core/config/env';

/**
 * Configuration for the `@playwright/test` suite only.
 *
 * `testDir` points at `tests/runner` rather than `tests`, because `tests/standalone`
 * holds plain Node journeys driven by `playwright-standalone` — those are executed
 * with `tsx`, not by this runner, and must not be collected here.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests/runner',

    /* Every spec file runs in parallel with the others. */
    fullyParallel: true,

    /* A stray `test.only` should fail the pipeline, not silently skip the suite. */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only — locally a flake should be visible, not papered over. */
    retries: process.env.CI ? 2 : 0,

    /* Hosted runners have fewer cores than a dev machine. */
    workers: process.env.CI ? 2 : undefined,

    timeout: 60_000,
    expect: { timeout: TIMEOUTS.expect },

    reporter: [
        ['list'],
        ['html', { open: 'never' }],
    ],

    use: {
        baseURL: BASE_URLS.sauceDemo,
        headless: true,
        actionTimeout: TIMEOUTS.action,
        navigationTimeout: TIMEOUTS.navigation,

        /* Artifacts only for failures — a green run should leave nothing behind. */
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    metadata: { environment: ENV },
});
