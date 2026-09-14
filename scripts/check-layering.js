#!/usr/bin/env node
'use strict';

/**
 * Enforces the rule the whole framework rests on:
 * **nothing under `src/` may import `@playwright/test`.**
 *
 * `src/` is the domain layer — screens, interactions, assertions. It is driven
 * by two different engines: `@playwright/test` for `tests/runner`, and
 * `playwright-standalone` for `tests/standalone`. The moment a screen imports
 * the test runner, it stops working under the other one, and the repo's central
 * claim quietly becomes false.
 *
 * A convention nobody checks erodes. This makes it a build failure.
 *
 * Matches import and require *statements*, not the bare string — several files
 * legitimately mention `@playwright/test` in a comment explaining this very
 * rule, and a naive substring search flags all of them.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'src');
const FORBIDDEN = '@playwright/test';

const IMPORT_PATTERN = new RegExp(
    String.raw`(?:^|\n)\s*(?:import\b[^;\n]*?\bfrom\s*|import\s*|export\b[^;\n]*?\bfrom\s*)` +
        String.raw`['"]${FORBIDDEN}['"]|require\(\s*['"]${FORBIDDEN}['"]\s*\)`
);

/** Every `.ts` file under a directory. */
function typeScriptFiles(dir) {
    const found = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...typeScriptFiles(full));
        else if (entry.name.endsWith('.ts')) found.push(full);
    }
    return found;
}

const offenders = typeScriptFiles(ROOT).filter((file) =>
    IMPORT_PATTERN.test(fs.readFileSync(file, 'utf-8'))
);

if (offenders.length > 0) {
    console.error(`\n✗ Layering violation: ${offenders.length} file(s) under src/ import ${FORBIDDEN}\n`);
    for (const file of offenders) {
        console.error(`  ${path.relative(path.join(__dirname, '..'), file)}`);
    }
    console.error(
        `\n  src/ is driven by two engines. Importing the test runner there breaks` +
            `\n  tests/standalone, which runs the same screens without it.` +
            `\n  Import types from 'playwright' instead.\n`
    );
    process.exit(1);
}

const checked = typeScriptFiles(ROOT).length;
console.log(`✓ Layering rule holds — ${checked} files under src/, none import ${FORBIDDEN}`);
