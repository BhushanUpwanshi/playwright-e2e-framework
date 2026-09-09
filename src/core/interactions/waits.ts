import type { Page } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/**
 * Condition-based waits.
 *
 * There is deliberately no `sleep(ms)` here. A fixed sleep is either longer than
 * needed — paid on every run, by every test — or shorter than needed on the one
 * slow CI run that matters, which is how a suite becomes intermittently red.
 * Everything below waits for an observable condition instead.
 */

/**
 * Waits for an element to become visible.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param timeout - How long to wait, in milliseconds.
 *
 * @throws {Error} When the element is not visible in time.
 */
export async function waitForVisible(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`wait for ${selector} to be visible`, async () => {
        await page.locator(selector).waitFor({ state: 'visible', timeout });
    });
}

/**
 * Waits for an element to disappear — removed from the DOM or hidden.
 *
 * The usual case is a loading spinner or overlay that intercepts clicks while
 * present.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param timeout - How long to wait, in milliseconds.
 *
 * @throws {Error} When the element is still showing at the timeout.
 */
export async function waitForHidden(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`wait for ${selector} to disappear`, async () => {
        await page.locator(selector).waitFor({ state: 'hidden', timeout });
    });
}

/**
 * Waits until the page URL matches.
 *
 * @param page - Page to observe.
 * @param urlPattern - Glob, regular expression or predicate the URL must match.
 * @param timeout - How long to wait, in milliseconds.
 *
 * @throws {Error} When the URL does not match in time.
 */
export async function waitForUrl(
    page: Page,
    urlPattern: string | RegExp | ((url: URL) => boolean),
    timeout: number = TIMEOUTS.navigation
): Promise<void> {
    await action(`wait for URL ${String(urlPattern)}`, async () => {
        await page.waitForURL(urlPattern, { timeout });
    });
}

/**
 * Waits until an element's text stops changing.
 *
 * For values that settle over several renders — a cart total recalculating, a
 * counter animating — where reading too early returns an intermediate value that
 * is neither the old one nor the final one.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param stableForMs - How long the text must hold steady to count as settled.
 * @param timeout - Overall budget before giving up, in milliseconds.
 *
 * @returns The settled text.
 *
 * @throws {Error} When the text never settles within the budget.
 */
export async function waitForStableText(
    page: Page,
    selector: string,
    stableForMs = 500,
    timeout: number = TIMEOUTS.action
): Promise<string> {
    return action(`wait for ${selector} text to settle`, async () => {
        const locator = page.locator(selector);
        const deadline = Date.now() + timeout;

        let previous = (await locator.textContent())?.trim() ?? '';
        let stableSince = Date.now();

        while (Date.now() < deadline) {
            // Polling is the right tool here: the condition is "nothing changed",
            // and there is no event for an absence of change.
            await page.waitForTimeout(100);

            const current = (await locator.textContent())?.trim() ?? '';
            if (current !== previous) {
                previous = current;
                stableSince = Date.now();
                continue;
            }
            if (Date.now() - stableSince >= stableForMs) return current;
        }

        throw new Error(
            `text did not settle within ${timeout}ms (last value: ${JSON.stringify(previous)})`
        );
    });
}
