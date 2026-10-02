#!/usr/bin/env node
'use strict';

/**
 * Points git at the versioned hooks directory.
 *
 * Run from the `prepare` script, so `npm install` sets it up once per clone.
 * `.git/hooks` is not versioned, so a hook committed there would never reach
 * anyone else; `core.hooksPath` is how a hook travels with the repository.
 *
 * Never fails the install. A missing git binary, or an npm install run outside
 * a working copy, is not a reason to stop someone installing dependencies.
 */

const { execSync } = require('node:child_process');

try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
    console.log('✓ git hooks installed (core.hooksPath -> .githooks)');
} catch {
    // Not a git working copy, or git is unavailable. Nothing to install.
}
