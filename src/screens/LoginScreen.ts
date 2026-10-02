import type { Page } from 'playwright';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { click } from '@core/interactions/click';
import { fill } from '@core/interactions/input';
import { getText, isVisible } from '@core/interactions/query';
import locators from '@locators/login.locators.json';
import { BaseScreen } from './BaseScreen';
import { InventoryScreen } from './InventoryScreen';

/** Credentials for a sign-in attempt. */
export interface Credentials {
    username: string;
    password: string;
}

/**
 * The sign-in screen.
 *
 * @example
 * ```ts
 * const inventory = await new LoginScreen(page).open()
 *     .then((login) => login.signIn({ username: 'standard_user', password: 'secret_sauce' }));
 * ```
 */
export class LoginScreen extends BaseScreen {
    protected readonly path = '/';
    protected readonly anchor = locators.loginContainer;

    /**
     * Enters credentials and submits, expecting to reach the inventory.
     *
     * @param credentials - Username and password to submit.
     *
     * @returns The inventory screen, carrying this screen's assertion buffer.
     *
     * @throws {Error} When the inventory does not appear — sign-in was refused.
     */
    async signIn(credentials: Credentials): Promise<InventoryScreen> {
        await this.submit(credentials);
        return new InventoryScreen(this.page, this.soft).waitUntilLoaded();
    }

    /**
     * Enters credentials and submits, expecting to stay put.
     *
     * Separate from {@link signIn} so the return type states which outcome the
     * test is after. A single method returning "inventory or still here" pushes
     * that decision into the test, where it reads as a branch rather than an
     * expectation.
     *
     * @param credentials - Username and password to submit.
     *
     * @returns The error message shown.
     */
    async signInExpectingFailure(credentials: Credentials): Promise<string> {
        await this.submit(credentials);
        return this.errorMessage();
    }

    /**
     * Fills the form and clicks the button, without judging the outcome.
     *
     * @param credentials - Username and password to submit.
     */
    async submit({ username, password }: Credentials): Promise<void> {
        // fill() with an empty string clears the field, which is exactly what the
        // "field left blank" cases need — so no branch on empty values here.
        await fill(this.page, locators.usernameInput, username);
        await fill(this.page, locators.passwordInput, password);
        await click(this.page, locators.loginButton);
    }

    /** The error banner's text. */
    async errorMessage(): Promise<string> {
        return getText(this.page, locators.errorMessage);
    }

    /** Whether an error banner is showing. */
    async hasError(): Promise<boolean> {
        return isVisible(this.page, locators.errorMessage, 2_000);
    }

    /**
     * Signs in and returns the inventory screen, starting from a fresh page.
     *
     * Shorthand for the setup most journeys open with.
     *
     * @param page - Page to drive.
     * @param credentials - Username and password to submit.
     * @param soft - Assertion buffer to carry through the journey.
     */
    static async signInAs(
        page: Page,
        credentials: Credentials,
        soft: SoftAssert = new SoftAssert()
    ): Promise<InventoryScreen> {
        const login = await new LoginScreen(page, soft).open();
        return login.signIn(credentials);
    }
}
