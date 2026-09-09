import { click } from '@core/interactions/click';
import { getAllText, count } from '@core/interactions/query';
import locators from '@locators/cart.locators.json';
import { BaseScreen } from './BaseScreen';
import { CheckoutInformationScreen } from './CheckoutInformationScreen';
import { HeaderComponent } from './components/HeaderComponent';

/** A line in the cart. */
export interface CartLine {
    name: string;
    price: number;
    quantity: number;
}

/**
 * The cart.
 */
export class CartScreen extends BaseScreen {
    protected readonly path = '/cart.html';
    protected readonly anchor = locators.list;

    readonly header = new HeaderComponent(this.page);

    /** Names of the products in the cart, in the order listed. */
    async productNames(): Promise<string[]> {
        return getAllText(this.page, locators.itemName);
    }

    /** Every line in the cart. */
    async lines(): Promise<CartLine[]> {
        const [names, prices, quantities] = await Promise.all([
            getAllText(this.page, locators.itemName),
            getAllText(this.page, locators.itemPrice),
            getAllText(this.page, locators.itemQuantity),
        ]);

        return names.map((name, index) => ({
            name,
            price: Number.parseFloat((prices[index] ?? '').replace('$', '')),
            quantity: Number.parseInt(quantities[index] ?? '0', 10),
        }));
    }

    /** How many lines the cart holds. */
    async lineCount(): Promise<number> {
        return count(this.page, locators.item);
    }

    /** Sum of the line prices, ignoring tax. */
    async subtotal(): Promise<number> {
        const lines = await this.lines();
        const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
        // Float arithmetic over currency drifts — 29.99 + 9.99 lands at
        // 39.980000000000004 — so round to the nearest paisa before comparing.
        return Math.round(total * 100) / 100;
    }

    /**
     * Starts checkout.
     *
     * @returns The customer-information screen, carrying this screen's
     *   assertion buffer.
     */
    async checkout(): Promise<CheckoutInformationScreen> {
        await click(this.page, locators.checkoutButton);
        return new CheckoutInformationScreen(this.page, this.soft).waitUntilLoaded();
    }
}
