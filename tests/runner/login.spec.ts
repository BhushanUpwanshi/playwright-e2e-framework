import { test, expect } from './fixtures/screens.fixture';
import { forEnv } from '@core/config/dataset';
import loginData from '@data/login.data.json';

const data = forEnv(loginData);

test.describe('Sign in', () => {
    // One test per account rather than a loop inside a single test: a failure
    // then names the account it happened on, and the others still run.
    for (const user of data.validUsers) {
        test(`signs in as ${user.username} — ${user.note}`, async ({ loginScreen, soft }) => {
            const inventory = await loginScreen.signIn({
                username: user.username,
                password: data.password,
            });

            expect(inventory.currentUrl()).toContain('/inventory.html');
            soft.assertEquals(await inventory.header.pageTitle(), 'Products', 'landing screen title');
            soft.assertTrue(
                (await inventory.productCount()) > 0,
                'products should be listed after signing in'
            );
        });
    }

    test('refuses a locked-out account with a specific reason', async ({ loginScreen, soft }) => {
        const message = await loginScreen.signInExpectingFailure({
            username: data.lockedOutUser.username,
            password: data.password,
        });

        soft.assertEquals(message, data.lockedOutUser.expectedError, 'locked-out message');
        // The message must be specific: "wrong credentials" for a locked account
        // sends the user to reset a password that was never the problem.
        soft.assertContains(message, 'locked out', 'names the actual reason');
        expect(loginScreen.currentUrl()).not.toContain('/inventory.html');
    });

    for (const invalid of data.invalidCredentials) {
        test(`rejects sign-in with ${invalid.case}`, async ({ loginScreen, soft }) => {
            const message = await loginScreen.signInExpectingFailure({
                username: invalid.username,
                password: invalid.password,
            });

            soft.assertEquals(message, invalid.expectedError, `error for ${invalid.case}`);
            expect(loginScreen.currentUrl()).not.toContain('/inventory.html');
        });
    }

    test('does not reveal whether the username exists', async ({ loginScreen, soft }) => {
        const unknownUser = await loginScreen.signInExpectingFailure({
            username: 'definitely_not_a_user',
            password: data.password,
        });
        const wrongPassword = await loginScreen.signInExpectingFailure({
            username: 'standard_user',
            password: 'definitely_not_the_password',
        });

        // Differing messages here would let an attacker enumerate valid usernames.
        soft.assertEquals(
            unknownUser,
            wrongPassword,
            'unknown user and wrong password should be indistinguishable'
        );
    });

    test('returns to the sign-in form after signing out', async ({ inventoryScreen, soft }) => {
        await inventoryScreen.header.logout();

        expect(inventoryScreen.currentUrl()).not.toContain('/inventory.html');
        soft.assertTrue(
            await inventoryScreen.rawPage.locator('[data-test="login-button"]').isVisible(),
            'sign-in form should be showing after signing out'
        );
    });
});
