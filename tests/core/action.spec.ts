import { test, expect } from '@playwright/test';
import { action } from '@core/logging/action';
import { truncate } from '@core/logging/logger';
import { captureLog } from './capture-log';

test.describe('action', () => {
    test('returns whatever the wrapped call resolves to', async () => {
        const { result } = await captureLog(() => action('read a value', async () => 42));
        expect(result).toBe(42);
    });

    test('logs a tick and the description on success', async () => {
        const { logs } = await captureLog(() =>
            action('click the button', async () => undefined)
        );
        expect(logs).toEqual(['✓ click the button']);
    });

    // The point of the wrapper: a bare Playwright timeout does not say which
    // element it was waiting for.
    test('prefixes the failure with what was being attempted', async () => {
        const thrown = await captureLog(async () =>
            action('fill the username field', async () => {
                throw new Error('locator.fill: Timeout 15000ms exceeded');
            }).catch((error: Error) => error)
        );

        expect(thrown.result.message).toBe(
            'fill the username field — locator.fill: Timeout 15000ms exceeded'
        );
    });

    // Re-throwing new Error(err.message) — the usual shortcut — drops the
    // original stack, and the trace then stops at the wrapper.
    test('keeps the original error as cause', async () => {
        const original = new Error('boom');

        const { result } = await captureLog(async () =>
            action('do the thing', async () => {
                throw original;
            }).catch((error: Error) => error)
        );

        expect(result.cause).toBe(original);
    });

    test('logs a cross and the reason on failure', async () => {
        const { warnings } = await captureLog(async () =>
            action('open the menu', async () => {
                throw new Error('not visible');
            }).catch(() => undefined)
        );

        expect(warnings).toEqual(['✗ open the menu — not visible']);
    });

    test('handles a thrown non-Error', async () => {
        const { result } = await captureLog(async () =>
            action('do the thing', async () => {
                throw 'a bare string';
            }).catch((error: Error) => error)
        );

        expect(result.message).toBe('do the thing — a bare string');
    });
});

test.describe('truncate', () => {
    test('passes short values through untouched', () => {
        expect(truncate('short')).toBe('short');
    });

    test('leaves a value of exactly the limit alone', () => {
        const exact = 'x'.repeat(120);
        expect(truncate(exact)).toBe(exact);
    });

    test('shortens longer values and reports the original length', () => {
        const long = 'x'.repeat(200);
        expect(truncate(long)).toBe(`${'x'.repeat(120)}… (200 chars)`);
    });

    test('honours a custom limit', () => {
        expect(truncate('abcdef', 3)).toBe('abc… (6 chars)');
    });
});
