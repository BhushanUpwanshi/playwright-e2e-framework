import { logAction } from './logger';

/**
 * Runs a browser action, logging the outcome and attaching context to failures.
 *
 * Every interaction in this framework is wrapped in this, which is why none of
 * them carry their own `try`/`catch`. Two things matter about the failure path:
 *
 * - The thrown message names **what was being attempted**, so a Playwright
 *   timeout reads as `fill the username field — locator.fill: Timeout 15000ms`
 *   rather than a bare timeout with no indication of which field.
 * - The original error is preserved as `cause`, so the underlying stack survives.
 *   Re-throwing `new Error(err.message)` — the usual shortcut — discards it, and
 *   the trace then stops at the wrapper instead of the failing call.
 *
 * @param description - What is being attempted, phrased as an action
 *   ("click the login button"). It appears in logs and in the failure message.
 * @param fn - The action to run.
 *
 * @returns Whatever `fn` resolves to.
 *
 * @throws {Error} With `description` prepended and the original error as `cause`.
 *
 * @example
 * ```ts
 * return action(`click ${selector}`, async () => {
 *     await page.locator(selector).click();
 * });
 * ```
 */
export async function action<T>(description: string, fn: () => Promise<T>): Promise<T> {
    try {
        const result = await fn();
        logAction(true, description);
        return result;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logAction(false, description, reason);
        throw new Error(`${description} — ${reason}`, { cause: error });
    }
}
