import type { Page, Response } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/** Options shared by the click helpers. */
export interface ClickOptions {
    /** How long to wait for the element to be actionable, in milliseconds. */
    timeout?: number;
    /** Bypass actionability checks. A last resort — prefer fixing the wait. */
    force?: boolean;
}

/**
 * Clicks an element.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param options - Timeout and force overrides.
 *
 * @example
 * ```ts
 * await click(page, locators.loginButton);
 * ```
 */
export async function click(
    page: Page,
    selector: string,
    { timeout = TIMEOUTS.action, force = false }: ClickOptions = {}
): Promise<void> {
    // No manual waitFor and no scrollIntoView before the click: Playwright's
    // actionability checks already wait for the element to be attached, visible,
    // stable and enabled, and scroll it into view. Repeating that here doubles
    // the wait budget and hides which check actually failed.
    await action(`click ${selector}`, async () => {
        await page.locator(selector).click({ timeout, force });
    });
}

/**
 * Clicks an element and waits for the network response it triggers.
 *
 * The click that fires a request and the assertion that reads the result are a
 * classic flake: the assertion runs against the pre-request DOM and fails
 * intermittently, usually only on a slower machine or in CI. Binding the click
 * to its response removes the race without an arbitrary sleep.
 *
 * The listener is registered *before* the click so a fast response cannot land
 * in the gap between the two.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param urlPattern - Glob, regular expression, or predicate over the `Response`
 *   matching the request to await.
 * @param options - Timeout and force overrides.
 *
 * @returns The matched response, so callers can assert on status or payload.
 *
 * @example
 * ```ts
 * const response = await clickAndWaitForResponse(
 *     page,
 *     locators.addToCart,
 *     '**\/api/cart'
 * );
 * soft.assertEquals(response.status(), 200, 'Add-to-cart response status');
 * ```
 */
export async function clickAndWaitForResponse(
    page: Page,
    selector: string,
    urlPattern: string | RegExp | ((response: Response) => boolean | Promise<boolean>),
    { timeout = TIMEOUTS.action, force = false }: ClickOptions = {}
): Promise<Response> {
    return action(`click ${selector} and await response ${String(urlPattern)}`, async () => {
        const [response] = await Promise.all([
            page.waitForResponse(urlPattern, { timeout }),
            page.locator(selector).click({ timeout, force }),
        ]);
        return response;
    });
}

/**
 * Scrolls an element into view.
 *
 * Rarely needed before a click, which scrolls on its own. It earns its place for
 * lazy-loaded content, where the element must enter the viewport to trigger the
 * fetch that renders what the test is actually after.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param timeout - How long to wait for the element to attach, in milliseconds.
 */
export async function scrollIntoView(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`scroll ${selector} into view`, async () => {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'attached', timeout });
        await locator.scrollIntoViewIfNeeded({ timeout });
    });
}
