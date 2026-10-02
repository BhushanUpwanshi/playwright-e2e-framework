import { click } from '@core/interactions/click';
import { fill } from '@core/interactions/input';
import { getText, isVisible } from '@core/interactions/query';
import locators from '@locators/checkout.locators.json';
import { BaseScreen } from './BaseScreen';
import { CheckoutOverviewScreen } from './CheckoutOverviewScreen';
import { HeaderComponent } from './components/HeaderComponent';

/** Delivery details the checkout form asks for. */
export interface Customer {
    firstName: string;
    lastName: string;
    postalCode: string;
}

/**
 * Checkout step one — the customer's details.
 */
export class CheckoutInformationScreen extends BaseScreen {
    protected readonly path = '/checkout-step-one.html';
    protected readonly anchor = locators.firstNameInput;

    readonly header = new HeaderComponent(this.page);

    /**
     * Fills the form without submitting it.
     *
     * @param customer - Details to enter. Empty strings clear the field, which
     *   is how the required-field cases are exercised.
     *
     * @returns This screen, for chaining.
     */
    async enterDetails(customer: Customer): Promise<this> {
        await fill(this.page, locators.firstNameInput, customer.firstName);
        await fill(this.page, locators.lastNameInput, customer.lastName);
        await fill(this.page, locators.postalCodeInput, customer.postalCode);
        return this;
    }

    /**
     * Fills the form and continues, expecting to reach the overview.
     *
     * @param customer - Details to enter.
     *
     * @returns The order overview, carrying this screen's assertion buffer.
     *
     * @throws {Error} When the overview does not appear — the form was rejected.
     */
    async continueWith(customer: Customer): Promise<CheckoutOverviewScreen> {
        await this.enterDetails(customer);
        await click(this.page, locators.continueButton);
        return new CheckoutOverviewScreen(this.page, this.soft).waitUntilLoaded();
    }

    /**
     * Fills the form and continues, expecting to be rejected.
     *
     * Paired with {@link continueWith} so the return type states which outcome
     * the test expects, rather than the test branching on what came back.
     *
     * @param customer - Details to enter.
     *
     * @returns The validation message shown.
     */
    async continueExpectingFailure(customer: Customer): Promise<string> {
        await this.enterDetails(customer);
        await click(this.page, locators.continueButton);
        return this.errorMessage();
    }

    /** The validation banner's text. */
    async errorMessage(): Promise<string> {
        return getText(this.page, locators.errorMessage);
    }

    /** Whether a validation banner is showing. */
    async hasError(): Promise<boolean> {
        return isVisible(this.page, locators.errorMessage, 2_000);
    }
}
