import type { Page } from 'playwright';
import { action } from '@core/logging/action';
import { truncate } from '@core/logging/logger';
import { TIMEOUTS } from '@core/config/env';

/**
 * Navigates to a URL and waits for the DOM to be ready.
 *
 * @param page - Page to navigate.
 * @param url - Absolute URL to open.
 * @param timeout - Navigation timeout in milliseconds.
 *
 * @example
 * ```ts
 * await navigateTo(page, BASE_URLS.sauceDemo);
 * ```
 */
export async function navigateTo(
    page: Page,
    url: string,
    timeout: number = TIMEOUTS.navigation
): Promise<void> {
    // `goto` already waits for the `load` event, so the only wait worth adding is
    // one the test actually depends on. Note what is deliberately NOT here:
    //
    //   - waiting for load states *before* navigating, which waits on the page
    //     being left rather than the one being opened
    //   - `networkidle`, which Playwright discourages: any polling, analytics
    //     beacon or open socket keeps the page from ever going idle, so it
    //     becomes a slow, environment-dependent source of flake
    //
    // Screens wait for the specific element they need instead.
    await action(`navigate to ${truncate(url)}`, async () => {
        await page.goto(url, { timeout, waitUntil: 'domcontentloaded' });
    });
}

/**
 * Reloads the current page.
 *
 * @param page - Page to reload.
 * @param timeout - Navigation timeout in milliseconds.
 */
export async function reload(
    page: Page,
    timeout: number = TIMEOUTS.navigation
): Promise<void> {
    await action('reload the page', async () => {
        await page.reload({ timeout, waitUntil: 'domcontentloaded' });
    });
}
