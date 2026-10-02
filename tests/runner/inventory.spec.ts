import { test, expect } from './fixtures/screens.fixture';
import { forEnv } from '@core/config/dataset';
import inventoryData from '@data/inventory.data.json';
import checkoutData from '@data/checkout.data.json';
import type { SortOption } from '@screens/InventoryScreen';

const data = forEnv(inventoryData);
const checkout = forEnv(checkoutData);

test.describe('Product list', () => {
    test('lists every product with a name and a price', async ({ inventoryScreen, soft }) => {
        const products = await inventoryScreen.products();

        soft.assertEquals(products.length, data.expectedProductCount, 'product count');
        for (const product of products) {
            soft.assertTrue(product.name.length > 0, 'every product should have a name');
            soft.assertTrue(
                Number.isFinite(product.price) && product.price > 0,
                `price should be a positive number for ${product.name}`
            );
        }
    });

    test.describe('Sorting', () => {
        test('orders names A to Z', async ({ inventoryScreen, soft }) => {
            await inventoryScreen.sortBy('az');
            const names = await inventoryScreen.productNames();

            soft.assertEquals(
                names.join('|'),
                [...names].sort((a, b) => a.localeCompare(b)).join('|'),
                'names ascending'
            );
        });

        test('orders names Z to A', async ({ inventoryScreen, soft }) => {
            await inventoryScreen.sortBy('za');
            const names = await inventoryScreen.productNames();

            soft.assertEquals(
                names.join('|'),
                [...names].sort((a, b) => b.localeCompare(a)).join('|'),
                'names descending'
            );
        });

        test('orders prices low to high', async ({ inventoryScreen, soft }) => {
            await inventoryScreen.sortBy('lohi');
            const prices = await inventoryScreen.productPrices();

            soft.assertEquals(
                prices.join('|'),
                [...prices].sort((a, b) => a - b).join('|'),
                'prices ascending'
            );
            soft.assertEquals(
                (await inventoryScreen.productNames())[0],
                data.cheapestProduct,
                'cheapest product first'
            );
        });

        test('orders prices high to low', async ({ inventoryScreen, soft }) => {
            await inventoryScreen.sortBy('hilo');
            const prices = await inventoryScreen.productPrices();

            soft.assertEquals(
                prices.join('|'),
                [...prices].sort((a, b) => b - a).join('|'),
                'prices descending'
            );
            soft.assertEquals(
                (await inventoryScreen.productNames())[0],
                data.dearestProduct,
                'dearest product first'
            );
        });

        // Sorting must not drop or duplicate anything — a bug that a
        // first-element assertion alone would miss entirely.
        for (const option of data.sortOptions) {
            test(`keeps every product when sorted by "${option.label}"`, async ({
                inventoryScreen,
                soft,
            }) => {
                await inventoryScreen.sortBy(option.value as SortOption);
                const names = await inventoryScreen.productNames();

                soft.assertEquals(names.length, data.expectedProductCount, 'nothing lost');
                soft.assertEquals(
                    new Set(names).size,
                    data.expectedProductCount,
                    'nothing duplicated'
                );
            });
        }
    });

    test.describe('Cart badge', () => {
        test('shows nothing until something is added', async ({ inventoryScreen, soft }) => {
            soft.assertEquals(await inventoryScreen.header.cartCount(), 0, 'badge starts empty');
        });

        test('counts each product added', async ({ inventoryScreen, soft }) => {
            const products = checkout.orders[1]!.products;

            for (const [index, product] of products.entries()) {
                await inventoryScreen.addToCart(product);
                soft.assertEquals(
                    await inventoryScreen.header.cartCount(),
                    index + 1,
                    `badge after adding ${product}`
                );
            }
        });

        test('counts down when a product is removed', async ({ inventoryScreen, soft }) => {
            const [first, second] = checkout.orders[1]!.products;

            await inventoryScreen.addAllToCart([first!, second!]);
            soft.assertEquals(await inventoryScreen.header.cartCount(), 2, 'badge after adding two');

            await inventoryScreen.removeFromCart(first!);
            soft.assertEquals(await inventoryScreen.header.cartCount(), 1, 'badge after removing one');
        });

        test('carries the added products through to the cart', async ({
            inventoryScreen,
            soft,
        }) => {
            const products = checkout.orders[1]!.products;
            await inventoryScreen.addAllToCart(products);

            const cart = await inventoryScreen.openCart();

            expect(cart.currentUrl()).toContain('/cart.html');
            soft.assertEquals(
                (await cart.productNames()).sort().join(','),
                [...products].sort().join(','),
                'cart contents match what was added'
            );
        });
    });
});
