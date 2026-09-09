import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Configuration for the framework's own tests — `tests/core`.
 *
 * These test `src/core` itself, not the application. Application tests live in
 * `tests/runner` (Playwright) and `tests/standalone` (playwright-standalone),
 * and are excluded here.
 *
 * Vitest does not read `paths` out of tsconfig, so the aliases are repeated
 * below. They must stay in step with `tsconfig.json`.
 */
export default defineConfig({
    test: {
        include: ['tests/core/**/*.test.ts'],
        environment: 'node',
        // Browser-backed cases launch Chromium; the default 5s is not enough.
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
    resolve: {
        alias: {
            '@core': path.resolve(__dirname, 'src/core'),
            '@screens': path.resolve(__dirname, 'src/screens'),
            '@locators': path.resolve(__dirname, 'src/locators'),
            '@data': path.resolve(__dirname, 'src/data'),
        },
    },
});
