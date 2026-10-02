import { test as base } from '@playwright/test';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { forEnv } from '@core/config/dataset';
import { setLogSink } from '@core/logging/logger';
import { InventoryScreen } from '@screens/InventoryScreen';
import { LoginScreen } from '@screens/LoginScreen';
import loginData from '@data/login.data.json';

const login = forEnv(loginData);

/** The baseline account — the one user with no deliberate defects. */
export const STANDARD_USER = {
    username: 'standard_user',
    password: login.password,
};

interface ScreenFixtures {
    /** Routes the framework's action log into the test report. Always on. */
    actionLog: string[];
    /** Assertion buffer, flushed automatically when the test ends. */
    soft: SoftAssert;
    /** The sign-in screen, already open. */
    loginScreen: LoginScreen;
    /** The product list, already signed in as the standard user. */
    inventoryScreen: InventoryScreen;
}

/**
 * `test`, extended with screen objects.
 *
 * Screens are fixtures rather than constructed in each test so that navigating
 * to them is setup, not part of the test body — a login spec should read as
 * assertions about signing in, not as four lines of arriving at the form.
 */
export const test = base.extend<ScreenFixtures>({
    /**
     * Collects the framework's action log and attaches it to the test.
     *
     * The interaction layer logs every click, fill and wait. Left on stdout that
     * output interleaves across parallel workers and buries the results — the
     * log of a passing test scrolls the failing one off the screen. Attached
     * instead, it stays with the test it belongs to and is there when a failure
     * needs explaining.
     *
     * `auto` so no test has to remember to ask for it.
     */
    actionLog: [
        async ({}, use, testInfo) => {
            const lines: string[] = [];
            setLogSink((_level, message) => lines.push(message));

            await use(lines);

            setLogSink(null);
            if (lines.length > 0) {
                await testInfo.attach('action-log.txt', {
                    body: lines.join('\n'),
                    contentType: 'text/plain',
                });
            }
        },
        { auto: true },
    ],

    /**
     * A shared assertion buffer, flushed in teardown.
     *
     * The flush is the point. `SoftAssert` only reports when `assertAll()` is
     * called, so a test that collects failures and forgets that call passes
     * while silently holding them — the worst outcome available, since it looks
     * like coverage. Flushing here means the test cannot forget.
     */
    soft: async ({}, use) => {
        const soft = new SoftAssert();
        await use(soft);
        soft.assertAll();
    },

    loginScreen: async ({ page, soft }, use) => {
        await use(await new LoginScreen(page, soft).open());
    },

    inventoryScreen: async ({ page, soft }, use) => {
        await use(await LoginScreen.signInAs(page, STANDARD_USER, soft));
    },
});

export { expect } from '@playwright/test';
