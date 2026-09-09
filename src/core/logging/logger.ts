/**
 * Console logging that prefixes each line with the caller's source location.
 *
 * The location is recovered from the stack trace, so a log line points at the
 * code that produced it rather than at this file.
 */

/** How far up the stack the actual caller sits, past `Error` and `log` itself. */
const CALLER_FRAME_INDEX = 2;

const LOCATION_PATTERN = /\(?((?:[A-Za-z]:)?[^()\s]+:\d+:\d+)\)?/;

/**
 * Extracts `file:line:column` for whoever called the logger.
 *
 * @returns The caller's location, or `'unknown'` when the stack is unavailable
 *   or shaped differently than expected — never throws, because a logger that
 *   can fail is worse than one that occasionally says "unknown".
 */
function callerLocation(): string {
    const frame = new Error().stack?.split('\n')[CALLER_FRAME_INDEX + 1] ?? '';
    const match = LOCATION_PATTERN.exec(frame);
    return match?.[1] ?? 'unknown';
}

/**
 * Logs a message prefixed with the caller's location.
 *
 * @param args - Values to log, forwarded to `console.log` unchanged.
 *
 * @example
 * ```ts
 * log('API request failed', { status: 500 });
 * // src/screens/LoginScreen.ts:24:9 > API request failed { status: 500 }
 * ```
 */
export function log(...args: unknown[]): void {
    console.log(`${callerLocation()} >`, ...args);
}

/**
 * Logs a warning prefixed with the caller's location.
 *
 * @param args - Values to log, forwarded to `console.warn` unchanged.
 */
export function warn(...args: unknown[]): void {
    console.warn(`${callerLocation()} > WARN`, ...args);
}

/**
 * Logs the outcome of a browser action, without a source location.
 *
 * Location is deliberately omitted. {@link log} reports its immediate caller, so
 * routing action output through it stamps every single line with `action.ts` —
 * the same prefix on every line, naming the wrapper rather than the code that
 * asked for the action. The description carries the meaning here, so the prefix
 * is noise at best and misleading at worst.
 *
 * @param succeeded - Whether the action completed.
 * @param description - What was attempted.
 * @param reason - Failure detail, when it did not.
 */
export function logAction(succeeded: boolean, description: string, reason?: string): void {
    const line = succeeded ? `✓ ${description}` : `✗ ${description} — ${reason ?? 'failed'}`;
    (succeeded ? console.log : console.warn)(line);
}

/**
 * Shortens a value for log output.
 *
 * Some arguments are legitimately huge — a `data:` URL carrying an entire
 * document, a base64 payload — and printing them in full buries every
 * surrounding line.
 *
 * @param value - Value to shorten.
 * @param max - Longest string to pass through untouched.
 *
 * @returns The value, or a truncated form with the original length noted.
 */
export function truncate(value: string, max = 120): string {
    return value.length <= max ? value : `${value.slice(0, max)}… (${value.length} chars)`;
}
