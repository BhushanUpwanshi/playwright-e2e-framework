/**
 * Logging for the framework.
 *
 * Output goes through a replaceable **sink** rather than straight to the
 * console. The interaction layer logs every action, which is what you want when
 * a journey fails — and which floods a test report when a hundred of them pass.
 * Where those lines should go depends on who is running the code:
 *
 * - a runner-less journey → the console, because stdout *is* the report
 * - a Playwright spec → attached to the test, so the log survives with the
 *   failure it belongs to instead of scrolling past
 * - the framework's own tests → discarded, except where the log is the thing
 *   under test
 *
 * A sink keeps that decision with the caller, and keeps `@playwright/test` out
 * of `core/` — the layering rule the whole repo rests on.
 */

/** Severity of a log line. */
export type LogLevel = 'info' | 'warn';

/** Receives log lines. */
export type LogSink = (level: LogLevel, message: string) => void;

const consoleSink: LogSink = (level, message) => {
    if (level === 'warn') console.warn(message);
    else console.log(message);
};

let activeSink: LogSink = consoleSink;

/**
 * Redirects log output.
 *
 * @param sink - Where lines should go. Pass `null` to restore the console.
 *
 * @example
 * ```ts
 * const lines: string[] = [];
 * setLogSink((_, message) => lines.push(message));
 * // ...
 * setLogSink(null);
 * ```
 */
export function setLogSink(sink: LogSink | null): void {
    activeSink = sink ?? consoleSink;
}

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
 * @param args - Values to log.
 *
 * @example
 * ```ts
 * log('API request failed', { status: 500 });
 * // src/screens/LoginScreen.ts:24:9 > API request failed { status: 500 }
 * ```
 */
export function log(...args: unknown[]): void {
    activeSink('info', `${callerLocation()} > ${args.map(String).join(' ')}`);
}

/**
 * Logs a warning prefixed with the caller's location.
 *
 * @param args - Values to log.
 */
export function warn(...args: unknown[]): void {
    activeSink('warn', `${callerLocation()} > WARN ${args.map(String).join(' ')}`);
}

/**
 * Logs the outcome of a browser action, without a source location.
 *
 * Location is deliberately omitted. {@link log} reports its immediate caller, so
 * routing action output through it stamps every line with `action.ts` — the same
 * prefix everywhere, naming the wrapper rather than the code that asked for the
 * action. The description carries the meaning here.
 *
 * @param succeeded - Whether the action completed.
 * @param description - What was attempted.
 * @param reason - Failure detail, when it did not.
 */
export function logAction(succeeded: boolean, description: string, reason?: string): void {
    if (succeeded) activeSink('info', `✓ ${description}`);
    else activeSink('warn', `✗ ${description} — ${reason ?? 'failed'}`);
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
