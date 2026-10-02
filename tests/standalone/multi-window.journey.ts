import fs from 'node:fs';
import path from 'node:path';
import { StandAloneClass } from 'playwright-standalone';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { DynamicLoadingScreen } from '@screens/DynamicLoadingScreen';
import { MultiWindowScreen } from '@screens/MultiWindowScreen';

/**
 * A journey that spans two browser tabs, ending in a failure.
 *
 * This is the case that justifies the runner-less engine. `@playwright/test`
 * records one video **per page**, so a journey like this produces two files —
 * each showing a frozen frame for the half of the run its tab sat idle, and
 * neither showing the moment things went wrong. `playwright-standalone` follows
 * the active tab with a single screencast, so the whole journey is one video
 * that cuts at the failing step.
 *
 * The second tab runs a five-second loading animation on purpose. Chromium's
 * screencast emits a frame only when the page **repaints**, so a journey across
 * two static pages produces a technically-correct video of about two frames.
 * The animation gives the recording something to record.
 *
 * The last step fails on purpose: videos are only written for failures, so a
 * fully passing journey would produce no artifact at all.
 *
 * Run with: npm run test:standalone:tabs
 */
const ARTIFACTS_DIR = 'test-results/standalone';

const soft = new SoftAssert();

const journey = new StandAloneClass({
    launchOptions: { headless: true },
    allureResultsDir: 'allure-results',
    ctrfDir: 'ctrf/cross-tab',
    artifactsDir: ARTIFACTS_DIR,
    screenshotsDir: `${ARTIFACTS_DIR}/failed-screenshots`,
});

journey.describe('Cross-tab journey', () => {
    let firstTab: MultiWindowScreen;
    let secondTabLoading: DynamicLoadingScreen;

    journey.setup(async (page) => {
        firstTab = await new MultiWindowScreen(page, soft).open();
    });

    journey.run('TC-01 | the first tab renders', async () => {
        soft.assertEquals(await firstTab.heading(), 'Opening a new window', 'first tab heading');
    });

    journey.run(
        'TC-02 | opens a second tab and follows it',
        async () => {
            const secondTab = await firstTab.openNewWindow();

            // The recording follows the active page, so switching here is what
            // keeps the video on the tab the journey is actually using.
            await journey.switchToPage(secondTab);

            soft.assertEquals(
                await new MultiWindowScreen(secondTab, soft).heading(),
                'New Window',
                'second tab heading'
            );

            secondTabLoading = await new DynamicLoadingScreen(secondTab, soft).open();
        },
        // Every later step acts on the second tab. Without this, a failure here
        // produces four more failures that all trace back to this one.
        { skipOnFail: true }
    );

    journey.run('TC-03 | waits out a slow render on the second tab', async () => {
        await secondTabLoading.start();
        soft.assertTrue(await secondTabLoading.isLoading(), 'spinner should be showing');

        soft.assertEquals(await secondTabLoading.waitForResult(), 'Hello World!', 'loaded text');
    });

    journey.run('TC-04 | the first tab is still usable after the switch', async () => {
        soft.assertEquals(
            await firstTab.heading(),
            'Opening a new window',
            'first tab survives the switch'
        );
    });

    journey.run('TC-05 | deliberate failure, to produce the video', async (page) => {
        // Nothing on this page carries that id. The point is the artifact: one
        // continuous recording spanning both tabs, cut at this step.
        await page.waitForSelector('#this-element-does-not-exist', { timeout: 3_000 });
    });
});

void (async () => {
    const exitCode = await journey.execute({ video: true });

    if (soft.hasFailures()) {
        console.error('\nSoft assertion failures:');
        for (const failure of soft.getFailures()) console.error(`  - ${failure}`);
        process.exit(1);
    }

    // This journey is a demonstration, and its last step fails on purpose. Its
    // success criterion is therefore not "nothing failed" but "the failure was
    // captured as a video" — so the exit code is inverted, and CI can run it
    // like any other check instead of needing a `|| true`.
    if (exitCode !== 1) {
        console.error('\nExpected the deliberate failure to be reported, but the run passed.');
        process.exit(1);
    }

    const videos = fs
        .readdirSync(ARTIFACTS_DIR)
        .filter((file) => file.endsWith('.mp4'))
        .map((file) => path.join(ARTIFACTS_DIR, file));

    if (videos.length !== 1) {
        console.error(`\nExpected exactly one video across both tabs, found ${videos.length}.`);
        process.exit(1);
    }

    const { size } = fs.statSync(videos[0]!);
    console.log(`\n✅ One continuous video across both tabs: ${videos[0]} (${size} bytes)`);
    process.exit(0);
})();
