import type { Page } from 'playwright';
import { click } from '@core/interactions/click';
import { getText, isVisible } from '@core/interactions/query';
import locators from '@locators/header.locators.json';

/**
 * The header that every signed-in screen carries.
 *
 * A component object rather than something on {@link BaseScreen}, because the
 * login screen has no header — putting these methods on the base would offer
 * `logout()` on a screen where nobody is signed in.
 */
export class HeaderComponent {
    constructor(private readonly page: Page) {}

    /** Title shown for the current screen, e.g. `Products`. */
    async pageTitle(): Promise<string> {
        return getText(this.page, locators.pageTitle);
    }

    /**
     * How many items the cart badge reports.
     *
     * The badge is absent rather than showing zero when the cart is empty, so an
     * empty cart is reported as `0` instead of failing to find the element.
     */
    async cartCount(): Promise<number> {
        if (!(await isVisible(this.page, locators.cartBadge, 1_000))) return 0;
        return Number.parseInt(await getText(this.page, locators.cartBadge), 10);
    }

    /** Opens the cart. */
    async openCart(): Promise<void> {
        await click(this.page, locators.cartLink);
    }

    /** Opens the burger menu. */
    async openMenu(): Promise<void> {
        await click(this.page, locators.menuButton);
    }

    /** Signs out, via the burger menu. */
    async logout(): Promise<void> {
        await this.openMenu();
        await click(this.page, locators.logoutLink);
    }

    /**
     * Resets cart contents and product state, via the burger menu.
     *
     * Worth calling between journeys that share a signed-in session: the cart
     * persists, so a test that assumes an empty cart fails only when something
     * before it added an item — a failure that depends on execution order.
     */
    async resetAppState(): Promise<void> {
        await this.openMenu();
        await click(this.page, locators.resetAppStateLink);
        await click(this.page, locators.closeMenuButton);
    }
}
