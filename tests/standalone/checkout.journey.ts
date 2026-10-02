import { StandAloneClass } from 'playwright-standalone';
import { SoftAssert } from '@core/assertions/SoftAssert';
import { forEnv } from '@core/config/dataset';
import { LoginScreen } from '@screens/LoginScreen';
import type { CartScreen } from '@screens/CartScreen';
import type { InventoryScreen } from '@screens/InventoryScreen';
import type { CheckoutOverviewScreen } from '@screens/CheckoutOverviewScreen';
import checkoutData from '@data/checkout.data.json';
import loginData from '@data/login.data.json';

/**
 * The checkout journey, driven without a test runner.
 *
 * **This file is the evidence for the claim the repo is built on.** The screens,
 * locators, interactions and test data it uses are the same ones
 * `tests/runner/checkout.spec.ts` uses — not adapted copies, the same modules.
 * Only the engine differs: there, `@playwright/test` supplies fixtures and
 * parallelism; here, steps are registered on a plain class and run in order.
 *
 * That is only possible because nothing under `src/` imports `@playwright/test`.
 * The layering rule is what makes the domain layer portable, and this file is
 * what proves the rule holds.
 *
 * Run with: npm run test:standalone
 */
const checkout = forEnv(checkoutData);
const login = forEnv(loginData);
const order = checkout.orders[1]!;

const money = (value: number): number => Math.round(value * 100) / 100;

const soft = new SoftAssert();

const journey = new StandAloneClass({
    launchOptions: { headless: true },
    allureResultsDir: 'allure-results',
    ctrfDir: 'ctrf/checkout',
    artifactsDir: 'test-results/standalone',
    screenshotsDir: 'test-results/standalone/failed-screenshots',
});

journey.describe('Checkout journey', () => {
    let inventory: InventoryScreen;
    let cart: CartScreen;
    let overview: CheckoutOverviewScreen;

    journey.setup(async (page) => {
        inventory = await LoginScreen.signInAs(
            page,
            { username: login.validUsers[0]!.username, password: login.password },
            soft
        );
    });

    journey.run('TC-01 | signs in and lists products', async () => {
        soft.assertEquals(await inventory.header.pageTitle(), 'Products', 'landing title');
        soft.assertTrue((await inventory.productCount()) > 0, 'products are listed');
    });

    // Every later step depends on the cart holding the right items, so a failure
    // here should stop the run rather than produce a cascade of confusing
    // downstream failures that all trace back to this one.
    journey.run(
        'TC-02 | adds the order to the cart',
        async () => {
            await inventory.addAllToCart(order.products);
            soft.assertEquals(
                await inventory.header.cartCount(),
                order.products.length,
                'cart badge'
            );
        },
        { skipOnFail: true }
    );

    journey.run('TC-03 | the cart lists what was added', async () => {
        cart = await inventory.openCart();

        soft.assertEquals(await cart.lineCount(), order.products.length, 'cart line count');
        soft.assertEquals(await cart.subtotal(), order.expectedSubtotal, 'cart subtotal');
        soft.assertEquals(
            (await cart.productNames()).sort().join(','),
            [...order.products].sort().join(','),
            'cart contents'
        );
    });

    journey.run('TC-04 | rejects incomplete customer details', async () => {
        const info = await cart.checkout();

        for (const invalid of checkout.requiredFieldErrors) {
            soft.assertEquals(
                await info.continueExpectingFailure(invalid.customer),
                invalid.expectedError,
                `validation: ${invalid.case}`
            );
        }

        overview = await info.continueWith(checkout.customer);
    });

    journey.run('TC-05 | totals add up', async () => {
        const totals = await overview.totals();

        soft.assertEquals(totals.subtotal, order.expectedSubtotal, 'subtotal');
        soft.assertEquals(
            totals.tax,
            money(order.expectedSubtotal * checkout.taxRate),
            `tax at ${checkout.taxRate * 100}%`
        );
        soft.assertEquals(
            money(totals.subtotal + totals.tax),
            totals.total,
            'total is subtotal plus tax'
        );
        soft.assertEquals(
            await overview.paymentInformation(),
            checkout.paymentInformation,
            'payment method'
        );
    });

    journey.run('TC-06 | confirms the order and empties the cart', async () => {
        const complete = await overview.finish();

        soft.assertEquals(
            await complete.heading(),
            checkout.confirmationHeading,
            'confirmation heading'
        );

        const pdf = await complete.downloadOrderPdf();
        soft.assertContains(pdf.suggestedFilename, '.pdf', 'order PDF');

        const backHome = await complete.backToProducts();
        soft.assertEquals(await backHome.header.cartCount(), 0, 'cart emptied after ordering');
    });

    journey.teardown(async () => {
        soft.assertAll();
    });
});

void (async () => {
    process.exit(await journey.execute({ video: true }));
})();
