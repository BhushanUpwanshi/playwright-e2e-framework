import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { action } from '@core/logging/action';
import { truncate } from '@core/logging/logger';

describe('action', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns whatever the wrapped call resolves to', async () => {
        await expect(action('read a value', async () => 42)).resolves.toBe(42);
    });

    it('logs a tick and the description on success', async () => {
        await action('click the button', async () => undefined);
        expect(console.log).toHaveBeenCalledWith('✓ click the button');
    });

    // The point of the wrapper: a bare Playwright timeout does not say which
    // element it was waiting for.
    it('prefixes the failure with what was being attempted', async () => {
        const failing = action('fill the username field', async () => {
            throw new Error('locator.fill: Timeout 15000ms exceeded');
        });

        await expect(failing).rejects.toThrowError(
            'fill the username field — locator.fill: Timeout 15000ms exceeded'
        );
    });

    // Re-throwing new Error(err.message) — the usual shortcut — drops the
    // original stack, and the trace then stops at the wrapper.
    it('keeps the original error as cause', async () => {
        const original = new Error('boom');

        await expect(
            action('do the thing', async () => {
                throw original;
            })
        ).rejects.toSatisfy((thrown: Error) => thrown.cause === original);
    });

    it('logs a cross and the reason on failure', async () => {
        await expect(
            action('open the menu', async () => {
                throw new Error('not visible');
            })
        ).rejects.toThrow();

        expect(console.warn).toHaveBeenCalledWith('✗ open the menu — not visible');
    });

    it('handles a thrown non-Error', async () => {
        await expect(
            action('do the thing', async () => {
                throw 'a bare string';
            })
        ).rejects.toThrowError('do the thing — a bare string');
    });
});

describe('truncate', () => {
    it('passes short values through untouched', () => {
        expect(truncate('short')).toBe('short');
    });

    it('leaves a value of exactly the limit alone', () => {
        const exact = 'x'.repeat(120);
        expect(truncate(exact)).toBe(exact);
    });

    it('shortens longer values and reports the original length', () => {
        const long = 'x'.repeat(200);
        expect(truncate(long)).toBe(`${'x'.repeat(120)}… (200 chars)`);
    });

    it('honours a custom limit', () => {
        expect(truncate('abcdef', 3)).toBe('abc… (6 chars)');
    });
});
