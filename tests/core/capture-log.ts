import { setLogSink } from '@core/logging/logger';

/** A line the framework logged, with its severity. */
export interface CapturedLine {
    level: 'info' | 'warn';
    message: string;
}

/**
 * Captures framework log output for the duration of a call.
 *
 * Uses the logger's sink rather than monkey-patching `console`. Patching a
 * global and restoring it is easy to get subtly wrong — a throwing call leaves
 * the console swallowed for everything after it — and it also catches output
 * from code that has nothing to do with the framework.
 *
 * @param fn - Code to run with logging captured.
 *
 * @returns Everything logged, split by severity, and whatever `fn` resolved to.
 */
export async function captureLog<T>(
    fn: () => Promise<T>
): Promise<{ lines: CapturedLine[]; logs: string[]; warnings: string[]; result: T }> {
    const lines: CapturedLine[] = [];
    setLogSink((level, message) => lines.push({ level, message }));

    try {
        const result = await fn();
        return {
            lines,
            logs: lines.filter((l) => l.level === 'info').map((l) => l.message),
            warnings: lines.filter((l) => l.level === 'warn').map((l) => l.message),
            result,
        };
    } finally {
        setLogSink(null);
    }
}

/**
 * Silences framework logging until {@link restoreLog} is called.
 *
 * For suites where the log is noise rather than the thing under test.
 */
export function silenceLog(): void {
    setLogSink(() => undefined);
}

/** Restores logging to the console. */
export function restoreLog(): void {
    setLogSink(null);
}
