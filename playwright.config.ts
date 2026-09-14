import { defineConfig, devices } from '@playwright/test';
import { BASE_URLS, ENV, TIMEOUTS } from '@core/config/env';

/**
 * Configuration for everything `@playwright/test` runs.
 *
 * Two projects, because the repo has two kinds of test with different needs:
 *
 * - `core` tests the framework itself — `src/core`. Mostly pure assertions, with
 *   browser-backed cases served from an intercepted fake origin, so it needs no
 *   network and no application to be up.
 * - `e2e` tests the application through the screens.
 *
 * There is deliberately no second test runner. `@playwright/test` already
 * provides `expect`, fixtures and a reporter, so adding one would mean two
 * assertion libraries and two reports for one repo.
 *
 * `tests/standalone` appears under neither project: those are plain Node
 * journeys driven by `playwright-standalone` and run with `tsx`, so this runner
 * must not collect them.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
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

    /*
     * The two report formats need different handling, because they are shaped
     * differently:
     *
     * - **Allure** writes one file per result into a shared directory and clears
     *   nothing, so the runner-less journeys write into the same `allure-results`
     *   and a single report covers every engine.
     * - **CTRF** is one JSON document per run. Pointing two producers at one file
     *   does not merge them — the second overwrites the first, silently. So each
     *   engine gets its own: `ctrf/playwright.json`, `ctrf/checkout/`,
     *   `ctrf/cross-tab/`.
     *
     * `npm run clean` clears both when a fresh report is wanted.
     */
    reporter: [
        ['list'],
        ['html', { open: 'never' }],
        ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: true }],
        ['playwright-ctrf-json-reporter', { outputDir: 'ctrf', outputFile: 'playwright.json' }],
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
            name: 'core',
            testDir: './tests/core',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'e2e',
            testDir: './tests/runner',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    metadata: { environment: ENV },
});
