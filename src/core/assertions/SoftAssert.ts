/**
 * Collects assertion failures and reports them together at the end of a test.
 *
 * A hard assertion stops at the first failure, so a broken page yields one
 * finding per run. Soft assertions let a journey finish and report everything
 * that was wrong, which is usually the more useful bug report.
 *
 * Deliberately free of any test-framework dependency — no `expect`, no
 * `@playwright/test` — so the same instance works inside a Playwright spec and
 * inside a runner-less journey.
 *
 * @example
 * ```ts
 * const soft = new SoftAssert();
 *
 * soft.assertEquals(await cart.count(), 3, 'Cart badge count');
 * soft.assertTrue(await banner.isVisible(), 'Promo banner should be visible');
 *
 * soft.assertAll(); // throws once, listing every failure
 * ```
 */
export class SoftAssert {
    private readonly failures: string[] = [];

    /**
     * Asserts strict equality.
     *
     * @param actual - Value produced by the system under test.
     * @param expected - Value the test requires.
     * @param message - Context describing what was being checked. Appended to,
     *   not replaced by, the actual-vs-expected detail — a failure that says only
     *   "Cart badge count" is as unhelpful as one that says only `"3" !== "2"`.
     */
    public assertEquals<T>(actual: T, expected: T, message?: string): void {
        if (Object.is(actual, expected)) return;

        const detail = `expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`;
        this.failures.push(message ? `${message} — ${detail}` : detail);
    }

    /**
     * Asserts that a string contains a substring.
     *
     * @param actual - String produced by the system under test.
     * @param expected - Substring it must contain.
     * @param message - Context describing what was being checked.
     */
    public assertContains(actual: string, expected: string, message?: string): void {
        if (actual.includes(expected)) return;

        const detail = `expected to contain ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`;
        this.failures.push(message ? `${message} — ${detail}` : detail);
    }

    /**
     * Asserts that a condition holds.
     *
     * @param condition - Condition to evaluate.
     * @param message - Failure message, required because a bare `false` says nothing.
     */
    public assertTrue(condition: boolean, message: string): void {
        if (!condition) this.failures.push(message);
    }

    /**
     * Asserts that a condition does not hold.
     *
     * @param condition - Condition to evaluate.
     * @param message - Failure message, required because a bare `true` says nothing.
     */
    public assertFalse(condition: boolean, message: string): void {
        if (condition) this.failures.push(message);
    }

    /**
     * Records a failure directly, for cases no assertion helper covers.
     *
     * @param message - Failure message.
     */
    public fail(message: string): void {
        this.failures.push(message);
    }

    /** Every failure recorded so far. */
    public getFailures(): readonly string[] {
        return [...this.failures];
    }

    /** Whether any assertion has failed. */
    public hasFailures(): boolean {
        return this.failures.length > 0;
    }

    /** Discards recorded failures, so one instance can be reused across journeys. */
    public reset(): void {
        this.failures.length = 0;
    }

    /**
     * Throws a single aggregated error if anything failed, then clears the buffer.
     *
     * Clearing matters: without it, a reused instance reports the same failures
     * again on the next call and a later passing check looks broken.
     *
     * @throws {Error} Listing every failure, numbered.
     */
    public assertAll(): void {
        if (this.failures.length === 0) return;

        const summary = this.failures
            .map((failure, index) => `  ${index + 1}. ${failure}`)
            .join('\n');
        const count = this.failures.length;

        this.reset();

        throw new Error(
            `${count} soft assertion${count === 1 ? '' : 's'} failed:\n${summary}`
        );
    }
}
