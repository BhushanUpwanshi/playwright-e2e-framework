import { test, expect } from './fixtures/screens.fixture';
import { forEnv } from '@core/config/dataset';
import checkoutData from '@data/checkout.data.json';

const data = forEnv(checkoutData);

/** Rounds to the nearest paisa — float arithmetic over currency drifts. */
const money = (value: number): number => Math.round(value * 100) / 100;

test.describe('Checkout', () => {
    for (const order of data.orders) {
        test(`completes an order of ${order.case}`, async ({ inventoryScreen, soft }) => {
            const cart = await inventoryScreen.addAllToCart(order.products).then((s) => s.openCart());

            soft.assertEquals(await cart.lineCount(), order.products.length, 'cart line count');
            soft.assertEquals(await cart.subtotal(), order.expectedSubtotal, 'cart subtotal');

            const overview = await cart.checkout().then((info) => info.continueWith(data.customer));

            soft.assertEquals(
                (await overview.productNames()).sort().join(','),
                [...order.products].sort().join(','),
                'order contents survive checkout'
            );

            const complete = await overview.finish();

            expect(complete.currentUrl()).toContain('/checkout-complete.html');
            soft.assertEquals(await complete.heading(), data.confirmationHeading, 'confirmation heading');
        });
    }

    test.describe('Order totals', () => {
        test('charges tax at the documented rate', async ({ inventoryScreen, soft }) => {
            const order = data.orders[1]!;

            const overview = await inventoryScreen
                .addAllToCart(order.products)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout())
                .then((info) => info.continueWith(data.customer));

            const totals = await overview.totals();

            soft.assertEquals(totals.subtotal, order.expectedSubtotal, 'subtotal');
            soft.assertEquals(
                totals.tax,
                money(order.expectedSubtotal * data.taxRate),
                `tax at ${data.taxRate * 100}%`
            );
        });

        // Worth asserting separately from the individual figures: each can be
        // right on its own while the sum shown to the customer is wrong.
        test('shows a total that equals subtotal plus tax', async ({ inventoryScreen, soft }) => {
            const order = data.orders[1]!;

            const overview = await inventoryScreen
                .addAllToCart(order.products)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout())
                .then((info) => info.continueWith(data.customer));

            const totals = await overview.totals();

            soft.assertEquals(
                money(totals.subtotal + totals.tax),
                totals.total,
                'total should be subtotal plus tax'
            );
        });

        test('states the payment and delivery method', async ({ inventoryScreen, soft }) => {
            const overview = await inventoryScreen
                .addToCart(data.orders[0]!.products[0]!)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout())
                .then((info) => info.continueWith(data.customer));

            soft.assertEquals(
                await overview.paymentInformation(),
                data.paymentInformation,
                'payment method'
            );
            soft.assertEquals(
                await overview.shippingInformation(),
                data.shippingInformation,
                'delivery method'
            );
        });
    });

    test.describe('Customer details validation', () => {
        for (const invalid of data.requiredFieldErrors) {
            test(`refuses to continue with ${invalid.case}`, async ({ inventoryScreen, soft }) => {
                const info = await inventoryScreen
                    .addToCart(data.orders[0]!.products[0]!)
                    .then((s) => s.openCart())
                    .then((cart) => cart.checkout());

                const message = await info.continueExpectingFailure(invalid.customer);

                soft.assertEquals(message, invalid.expectedError, `error for ${invalid.case}`);
                expect(info.currentUrl()).toContain('/checkout-step-one.html');
            });
        }

        test('continues once every required field is filled', async ({ inventoryScreen, soft }) => {
            const info = await inventoryScreen
                .addToCart(data.orders[0]!.products[0]!)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout());

            // Rejected first, then corrected — proves the form recovers rather
            // than staying stuck once it has shown an error.
            await info.continueExpectingFailure(data.requiredFieldErrors[0]!.customer);
            const overview = await info.continueWith(data.customer);

            expect(overview.currentUrl()).toContain('/checkout-step-two.html');
            soft.assertFalse(await info.hasError(), 'error should clear once the form is valid');
        });
    });

    test.describe('After ordering', () => {
        test('empties the cart', async ({ inventoryScreen, soft }) => {
            const backHome = await inventoryScreen
                .addAllToCart(data.orders[1]!.products)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout())
                .then((info) => info.continueWith(data.customer))
                .then((overview) => overview.finish())
                .then((complete) => complete.backToProducts());

            soft.assertEquals(await backHome.header.cartCount(), 0, 'cart should be empty');
        });

        test('offers the order as a downloadable PDF', async ({ inventoryScreen, soft }) => {
            const complete = await inventoryScreen
                .addToCart(data.orders[0]!.products[0]!)
                .then((s) => s.openCart())
                .then((cart) => cart.checkout())
                .then((info) => info.continueWith(data.customer))
                .then((overview) => overview.finish());

            const pdf = await complete.downloadOrderPdf();

            soft.assertContains(pdf.suggestedFilename, '.pdf', 'downloaded file should be a PDF');
        });
    });

    test('abandons an order without losing the cart', async ({ inventoryScreen, soft }) => {
        const order = data.orders[0]!;

        const overview = await inventoryScreen
            .addAllToCart(order.products)
            .then((s) => s.openCart())
            .then((cart) => cart.checkout())
            .then((info) => info.continueWith(data.customer));

        await overview.cancel();

        soft.assertEquals(
            await inventoryScreen.header.cartCount(),
            order.products.length,
            'cancelling checkout should keep the cart intact'
        );
    });
});
