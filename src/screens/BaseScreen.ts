import type { Page } from 'playwright';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { BASE_URLS } from '@core/config/env';
import { navigateTo } from '@core/interactions/navigation';
import { waitForVisible } from '@core/interactions/waits';

/**
 * Base for every screen object.
 *
 * Two contracts subclasses must satisfy:
 *
 * - `path` — where the screen lives, so it can be opened directly rather than
 *   only reached by clicking through everything before it.
 * - `anchor` — an element whose presence proves the screen actually rendered.
 *   Screens wait on this rather than on a load state, because "the document
 *   loaded" and "the screen is usable" are different moments in a single-page
 *   application, and asserting against the gap between them is a common flake.
 *
 * Deliberately typed against `playwright`'s `Page`, never `@playwright/test`, so
 * screens work unchanged under both execution engines.
 */
export abstract class BaseScreen {
    protected readonly page: Page;

    /**
     * Assertion buffer, shared across every screen in a journey.
     *
     * Passed between screens rather than created per screen: a checkout journey
     * touches four of them, and failures should aggregate into one report at the
     * end instead of being lost when the flow moves on.
     */
    readonly soft: SoftAssert;

    /** Path under the application's base URL, e.g. `/inventory.html`. */
    protected abstract readonly path: string;

    /** Selector proving the screen has rendered. */
    protected abstract readonly anchor: string;

    /**
     * Which application this screen belongs to.
     *
     * Defaults to Sauce Demo, which most screens here target. Screens for
     * another application override it — the framework drives two, and baking one
     * base URL into the class every screen inherits from would make the second
     * impossible to express.
     */
    protected get baseUrl(): string {
        return BASE_URLS.sauceDemo;
    }

    constructor(page: Page, soft: SoftAssert = new SoftAssert()) {
        this.page = page;
        this.soft = soft;
    }

    /**
     * Navigates straight to this screen and waits for it to render.
     *
     * @returns This screen, for chaining.
     */
    async open(): Promise<this> {
        await navigateTo(this.page, `${this.baseUrl}${this.path}`);
        return this.waitUntilLoaded();
    }

    /**
     * Waits until the screen has rendered.
     *
     * @returns This screen, for chaining.
     */
    async waitUntilLoaded(): Promise<this> {
        await waitForVisible(this.page, this.anchor);
        return this;
    }

    /** The browser's current URL. */
    currentUrl(): string {
        return this.page.url();
    }

    /** The underlying page, for the rare case a test needs it directly. */
    get rawPage(): Page {
        return this.page;
    }
}
