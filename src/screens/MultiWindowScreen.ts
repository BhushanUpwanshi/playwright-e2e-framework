import type { Page } from 'playwright';
import { BASE_URLS, TIMEOUTS } from '@core/config/env';
import { action } from '@core/logging/action';
import { click } from '@core/interactions/click';
import { getText } from '@core/interactions/query';
import locators from '@locators/multiWindow.locators.json';
import { BaseScreen } from './BaseScreen';

/**
 * A page that opens a second browser tab.
 *
 * Belongs to a different application from the rest of the screens here — it
 * overrides {@link BaseScreen.baseUrl} accordingly. It exists because a tab
 * switch is the case the runner-less engine handles and `@playwright/test` does
 * not: Playwright records one video per page, so a journey that moves between
 * tabs produces two files, each showing a frozen frame for the half of the run
 * its tab was idle.
 */
export class MultiWindowScreen extends BaseScreen {
    protected readonly path = '/windows';
    protected readonly anchor = locators.heading;

    protected override get baseUrl(): string {
        return BASE_URLS.theInternet;
    }

    /** The heading on the current page. */
    async heading(): Promise<string> {
        return getText(this.page, locators.heading);
    }

    /**
     * Opens the second tab and returns it.
     *
     * The listener for the new page is registered **before** the click, for the
     * same reason `clickAndWaitForResponse` does: a tab that opens quickly would
     * otherwise appear before anything is waiting for it.
     *
     * Note this returns the new `Page` rather than switching to it. Which page
     * is "active" is the executing engine's concern — `playwright-standalone`
     * tracks one and follows it with the recording, while a Playwright spec just
     * holds two handles — so the screen hands back the page and lets the caller
     * decide.
     *
     * @param timeout - How long to wait for the tab to open, in milliseconds.
     *
     * @returns The newly opened page, loaded.
     */
    async openNewWindow(timeout: number = TIMEOUTS.navigation): Promise<Page> {
        return action('open a second tab', async () => {
            const [popup] = await Promise.all([
                this.page.context().waitForEvent('page', { timeout }),
                click(this.page, locators.openNewWindowLink),
            ]);

            await popup.waitForLoadState('domcontentloaded');
            return popup;
        });
    }
}
