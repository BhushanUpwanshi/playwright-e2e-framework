import { click } from '@core/interactions/click';
import { selectOption } from '@core/interactions/input';
import { getAllText, count } from '@core/interactions/query';
import locators from '@locators/inventory.locators.json';
import { BaseScreen } from './BaseScreen';
import { CartScreen } from './CartScreen';
import { HeaderComponent } from './components/HeaderComponent';

/** How the product list can be ordered. */
export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

/** A product as listed on the inventory screen. */
export interface Product {
    name: string;
    price: number;
}

/**
 * The product listing shown after signing in.
 */
export class InventoryScreen extends BaseScreen {
    protected readonly path = '/inventory.html';
    protected readonly anchor = locators.list;

    readonly header = new HeaderComponent(this.page);

    /**
     * Selector for the add/remove button belonging to a named product.
     *
     * Scoped by product name via `:has-text()` rather than by building a
     * `data-test` slug from the name. The slugs are real — `add-to-cart-sauce-
     * labs-backpack` — but deriving them means encoding a transformation the
     * application owns, and one product is literally named
     * `Test.allTheThings() T-Shirt (Red)`, which no sensible slug rule survives.
     */
    private productButton(productName: string): string {
        return `${locators.item}:has-text(${JSON.stringify(productName)}) button`;
    }

    /** Every product name, in the order displayed. */
    async productNames(): Promise<string[]> {
        return getAllText(this.page, locators.itemName);
    }

    /** Every product price, in the order displayed. */
    async productPrices(): Promise<number[]> {
        const rendered = await getAllText(this.page, locators.itemPrice);
        return rendered.map((price) => Number.parseFloat(price.replace('$', '')));
    }

    /** Every product with its price, in the order displayed. */
    async products(): Promise<Product[]> {
        const [names, prices] = await Promise.all([this.productNames(), this.productPrices()]);
        return names.map((name, index) => ({ name, price: prices[index] ?? Number.NaN }));
    }

    /** How many products are listed. */
    async productCount(): Promise<number> {
        return count(this.page, locators.item);
    }

    /**
     * Adds a product to the cart.
     *
     * @param productName - Product name exactly as displayed.
     *
     * @returns This screen, for chaining.
     */
    async addToCart(productName: string): Promise<this> {
        await click(this.page, this.productButton(productName));
        return this;
    }

    /**
     * Adds several products to the cart, in order.
     *
     * @param productNames - Product names exactly as displayed.
     *
     * @returns This screen, for chaining.
     */
    async addAllToCart(productNames: readonly string[]): Promise<this> {
        for (const name of productNames) {
            await this.addToCart(name);
        }
        return this;
    }

    /**
     * Removes a product from the cart.
     *
     * The same button toggles between Add and Remove, so this shares
     * {@link productButton} with {@link addToCart} — the label changes, the
     * element does not.
     *
     * @param productName - Product name exactly as displayed.
     *
     * @returns This screen, for chaining.
     */
    async removeFromCart(productName: string): Promise<this> {
        await click(this.page, this.productButton(productName));
        return this;
    }

    /**
     * Reorders the product list.
     *
     * @param option - Sort order to apply.
     *
     * @returns This screen, for chaining.
     */
    async sortBy(option: SortOption): Promise<this> {
        await selectOption(this.page, locators.sortDropdown, option);
        return this;
    }

    /** The sort order currently shown in the dropdown. */
    async activeSortLabel(): Promise<string> {
        return getAllText(this.page, locators.activeSortOption).then((labels) => labels[0] ?? '');
    }

    /**
     * Opens the cart.
     *
     * @returns The cart screen, carrying this screen's assertion buffer.
     */
    async openCart(): Promise<CartScreen> {
        await this.header.openCart();
        return new CartScreen(this.page, this.soft).waitUntilLoaded();
    }
}
