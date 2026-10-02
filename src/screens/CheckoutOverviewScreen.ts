import { click } from '@core/interactions/click';
import { getAllText, getText } from '@core/interactions/query';
import locators from '@locators/checkout.locators.json';
import { BaseScreen } from './BaseScreen';
import { CheckoutCompleteScreen } from './CheckoutCompleteScreen';
import { HeaderComponent } from './components/HeaderComponent';

/** The money summary shown before confirming an order. */
export interface OrderTotals {
    subtotal: number;
    tax: number;
    total: number;
}

/**
 * Checkout step two — the order summary.
 */
export class CheckoutOverviewScreen extends BaseScreen {
    protected readonly path = '/checkout-step-two.html';
    protected readonly anchor = locators.finishButton;

    readonly header = new HeaderComponent(this.page);

    /** Names of the products in the order. */
    async productNames(): Promise<string[]> {
        return getAllText(this.page, `${locators.summaryList} [data-test="inventory-item-name"]`);
    }

    /**
     * Reads the subtotal, tax and total.
     *
     * Each is rendered with its label — `Item total: $29.99` — so the number is
     * taken from after the `$` rather than by parsing the whole string. Anchoring
     * on the symbol keeps this working if the label wording ever changes.
     */
    async totals(): Promise<OrderTotals> {
        const [subtotalText, taxText, totalText] = await Promise.all([
            getText(this.page, locators.subtotalLabel),
            getText(this.page, locators.taxLabel),
            getText(this.page, locators.totalLabel),
        ]);

        return {
            subtotal: amountFrom(subtotalText),
            tax: amountFrom(taxText),
            total: amountFrom(totalText),
        };
    }

    /** The payment method shown, e.g. `SauceCard #31337`. */
    async paymentInformation(): Promise<string> {
        return getText(this.page, locators.paymentInformation);
    }

    /** The delivery method shown. */
    async shippingInformation(): Promise<string> {
        return getText(this.page, locators.shippingInformation);
    }

    /**
     * Confirms the order.
     *
     * @returns The confirmation screen, carrying this screen's assertion buffer.
     */
    async finish(): Promise<CheckoutCompleteScreen> {
        await click(this.page, locators.finishButton);
        return new CheckoutCompleteScreen(this.page, this.soft).waitUntilLoaded();
    }

    /** Abandons the order and returns to the product list. */
    async cancel(): Promise<void> {
        await click(this.page, locators.cancelButton);
    }
}

/**
 * Extracts the amount from a labelled currency string.
 *
 * @param labelled - Text such as `Item total: $29.99`.
 *
 * @returns The numeric amount, or `NaN` when the text carries none.
 */
function amountFrom(labelled: string): number {
    const match = /\$\s*([\d,]+\.?\d*)/.exec(labelled);
    return match ? Number.parseFloat(match[1]!.replace(/,/g, '')) : Number.NaN;
}
