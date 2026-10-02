import { test, expect } from '@playwright/test';
import { SoftAssert } from '@core/assertions/SoftAssert';

test.describe('SoftAssert', () => {
    test.describe('assertEquals', () => {
        test('records nothing when the values match', () => {
            const soft = new SoftAssert();
            soft.assertEquals('a', 'a');
            expect(soft.hasFailures()).toBe(false);
        });

        test('reports both values, not just the message', () => {
            const soft = new SoftAssert();
            soft.assertEquals(2, 3, 'Cart count');
            expect(soft.getFailures()[0]).toBe('Cart count — expected 3, found 2');
        });

        test('still reports the values when no message is given', () => {
            const soft = new SoftAssert();
            soft.assertEquals('x', 'y');
            expect(soft.getFailures()[0]).toBe('expected "y", found "x"');
        });

        test('treats NaN as equal to NaN', () => {
            const soft = new SoftAssert();
            // Object.is, not ===, so a NaN result does not read as a spurious failure.
            soft.assertEquals(Number.NaN, Number.NaN);
            expect(soft.hasFailures()).toBe(false);
        });

        test('distinguishes 0 from -0', () => {
            const soft = new SoftAssert();
            soft.assertEquals(0, -0);
            expect(soft.hasFailures()).toBe(true);
        });
    });

    test.describe('assertContains', () => {
        test('passes when the substring is present', () => {
            const soft = new SoftAssert();
            soft.assertContains('checkout complete', 'complete');
            expect(soft.hasFailures()).toBe(false);
        });

        test('reports the full string when it is absent', () => {
            const soft = new SoftAssert();
            soft.assertContains('checkout failed', 'complete', 'Banner');
            expect(soft.getFailures()[0]).toContain('expected to contain "complete"');
            expect(soft.getFailures()[0]).toContain('found "checkout failed"');
        });
    });

    test('records assertTrue and assertFalse failures', () => {
        const soft = new SoftAssert();
        soft.assertTrue(false, 'should be true');
        soft.assertFalse(true, 'should be false');
        soft.assertTrue(true, 'not recorded');
        soft.assertFalse(false, 'not recorded');

        expect(soft.getFailures()).toEqual(['should be true', 'should be false']);
    });

    test('records a direct failure', () => {
        const soft = new SoftAssert();
        soft.fail('nothing rendered');
        expect(soft.getFailures()).toEqual(['nothing rendered']);
    });

    test.describe('assertAll', () => {
        test('does nothing when everything passed', () => {
            const soft = new SoftAssert();
            soft.assertTrue(true, 'fine');
            expect(() => soft.assertAll()).not.toThrow();
        });

        test('throws once, listing every failure, numbered', () => {
            const soft = new SoftAssert();
            soft.assertTrue(false, 'first');
            soft.assertTrue(false, 'second');

            expect(() => soft.assertAll()).toThrow(
                '2 soft assertions failed:\n  1. first\n  2. second'
            );
        });

        test('uses the singular for exactly one failure', () => {
            const soft = new SoftAssert();
            soft.fail('only one');
            expect(() => soft.assertAll()).toThrow('1 soft assertion failed');
        });

        // Without clearing, a reused instance re-reports old failures and a later
        // passing check looks broken.
        test('clears the buffer, so a second call is clean', () => {
            const soft = new SoftAssert();
            soft.fail('first run');

            expect(() => soft.assertAll()).toThrow();
            expect(soft.hasFailures()).toBe(false);
            expect(() => soft.assertAll()).not.toThrow();
        });
    });

    test('hands out a copy of the failures, not the live array', () => {
        const soft = new SoftAssert();
        soft.fail('real');

        (soft.getFailures() as string[]).push('injected');

        expect(soft.getFailures()).toEqual(['real']);
    });

    test('reset discards failures without throwing', () => {
        const soft = new SoftAssert();
        soft.fail('discarded');
        soft.reset();
        expect(soft.hasFailures()).toBe(false);
    });
});
