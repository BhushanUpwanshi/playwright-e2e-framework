import { BASE_URLS } from '@core/config/env';
import { click } from '@core/interactions/click';
import { getText } from '@core/interactions/query';
import { waitForHidden, waitForVisible } from '@core/interactions/waits';
import locators from '@locators/dynamicLoading.locators.json';
import { BaseScreen } from './BaseScreen';

/**
 * A page whose content is rendered only after a deliberate delay.
 *
 * The element under test does not exist in the DOM until loading finishes, which
 * is the case `waitForVisible` is for — and the case a bare `isVisible()` check
 * gets wrong, because it answers about the DOM as it stands rather than waiting.
 */
export class DynamicLoadingScreen extends BaseScreen {
    protected readonly path = '/dynamic_loading/2';
    protected readonly anchor = locators.startButton;

    protected override get baseUrl(): string {
        return BASE_URLS.theInternet;
    }

    /** Starts loading. Returns immediately; the result arrives later. */
    async start(): Promise<this> {
        await click(this.page, locators.startButton);
        return this;
    }

    /**
     * Waits for loading to finish and returns what was rendered.
     *
     * Waits for the spinner to go **and** the result to appear. Waiting only for
     * the result would pass the moment it enters the DOM, which on a slower
     * render can be before the spinner has cleared — and a screenshot taken then
     * shows a half-finished page that is hard to interpret later.
     *
     * @param timeout - How long to allow, in milliseconds. The page takes about
     *   five seconds by design.
     *
     * @returns The rendered text.
     */
    async waitForResult(timeout = 15_000): Promise<string> {
        await waitForHidden(this.page, locators.loadingIndicator, timeout);
        await waitForVisible(this.page, locators.result, timeout);
        return getText(this.page, locators.result);
    }

    /** Whether the spinner is currently showing. */
    async isLoading(): Promise<boolean> {
        return this.page.locator(locators.loadingIndicator).isVisible();
    }
}
