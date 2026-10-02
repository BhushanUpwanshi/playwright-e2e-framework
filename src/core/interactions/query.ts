import type { Page } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/**
 * Reads an element's trimmed text.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param timeout - How long to wait for the element to be visible, in milliseconds.
 *
 * @returns The element's text content, trimmed. Empty string if it has none.
 */
export async function getText(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<string> {
    return action(`read text from ${selector}`, async () => {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout });
        return (await locator.textContent())?.trim() ?? '';
    });
}

/**
 * Reads the trimmed text of every element matching a selector.
 *
 * @param page - Page holding the elements.
 * @param selector - Selector matching zero or more elements.
 *
 * @returns One trimmed string per match, in DOM order. Empty when nothing matches.
 */
export async function getAllText(page: Page, selector: string): Promise<string[]> {
    return action(`read text from all ${selector}`, async () => {
        const texts = await page.locator(selector).allTextContents();
        return texts.map((text) => text.trim());
    });
}

/**
 * Reads an attribute from an element.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param attribute - Attribute name.
 * @param timeout - How long to wait for the element, in milliseconds.
 *
 * @returns The attribute value, or `null` when the attribute is absent.
 */
export async function getAttribute(
    page: Page,
    selector: string,
    attribute: string,
    timeout: number = TIMEOUTS.action
): Promise<string | null> {
    return action(`read @${attribute} from ${selector}`, async () => {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'attached', timeout });
        return locator.getAttribute(attribute);
    });
}

/**
 * Reports whether an element becomes visible within the timeout.
 *
 * Note the difference from Playwright's `locator.isVisible()`, which answers
 * about the DOM *right now* and returns `false` for an element that is one tick
 * from rendering. That makes it a reliable source of flake in exactly the place
 * it gets reached for. This waits, and treats the timeout as "not visible"
 * rather than an error — which is what a caller asking a yes/no question wants.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param timeout - How long to wait before answering `false`, in milliseconds.
 *
 * @returns `true` if the element became visible in time, `false` otherwise.
 */
export async function isVisible(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<boolean> {
    try {
        await page.locator(selector).waitFor({ state: 'visible', timeout });
        return true;
    } catch {
        return false;
    }
}

/**
 * Counts the elements matching a selector.
 *
 * Resolves immediately against the current DOM — it does not wait for elements
 * to appear. Await the first one with {@link isVisible} before counting if the
 * list renders asynchronously.
 *
 * @param page - Page holding the elements.
 * @param selector - Selector matching zero or more elements.
 *
 * @returns How many elements matched.
 */
export async function count(page: Page, selector: string): Promise<number> {
    return page.locator(selector).count();
}
