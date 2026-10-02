#!/usr/bin/env node
'use strict';

/**
 * Enforces sole authorship of this repository.
 *
 * The work here is presented as the author's own — on a CV, in interviews, as a
 * portfolio piece. Tooling was used while writing it, as tooling always is, but
 * the design decisions and the intellectual property are the author's. A
 * machine-generated co-author trailer states otherwise, permanently and in
 * public, in a place nobody thinks to check before sharing a link.
 *
 * Two modes:
 *
 * - `--message <file>` — checks one message plus the configured identity.
 *   Invoked by the `commit-msg` hook, so a bad commit is never created.
 * - no arguments — scans the whole history. Run in CI, because a hook lives only
 *   in the local clone, does not exist in a fresh one until dependencies are
 *   installed, and is skipped entirely by `git commit --no-verify`. The hook is
 *   convenience; this is the guarantee.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

/** Patterns that must never appear in a commit message. */
const FORBIDDEN_IN_MESSAGE = [
    /^\s*Co-Authored-By:\s*(claude|anthropic)/im,
    /noreply@anthropic\.com/i,
    /Generated with \[?Claude/i,
    /Generated with \[?Cursor/i,
    /\u{1F916}\s*Generated with/u,
];

/** Patterns that must never appear in an author or committer identity. */
const FORBIDDEN_IN_IDENTITY = [/\bclaude\b/i, /\banthropic\b/i, /\bcopilot\b/i];

const FIELD = '@@F@@';
const RECORD = '@@R@@';

/**
 * Runs git without a shell.
 *
 * `execSync` would route this through cmd.exe on Windows, where the separators
 * in the log format are read as redirection operators. Passing an argument array
 * avoids the shell entirely.
 *
 * @param args - Arguments to pass to git.
 */
function git(args) {
    return execFileSync('git', args, { encoding: 'utf-8' }).trim();
}

function fail(lines) {
    console.error('\n✗ Authorship check failed\n');
    for (const line of lines) console.error(`  ${line}`);
    console.error(
        "\n  This repository is presented as the author's own work." +
            '\n  Commits must carry no machine co-author trailer, and no' +
            '\n  Claude, Anthropic or Copilot identity.\n'
    );
    process.exit(1);
}

/** Checks a single pending commit — the `commit-msg` hook path. */
function checkPendingCommit(messageFile) {
    const problems = [];
    const message = fs.readFileSync(messageFile, 'utf-8');

    for (const pattern of FORBIDDEN_IN_MESSAGE) {
        const match = pattern.exec(message);
        if (match) problems.push(`message contains: ${match[0].trim()}`);
    }

    for (const variable of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
        const identity = git(['var', variable]);
        for (const pattern of FORBIDDEN_IN_IDENTITY) {
            if (pattern.test(identity)) problems.push(`${variable} is: ${identity}`);
        }
    }

    if (problems.length > 0) fail(problems);
    process.exit(0);
}

/** Scans every commit reachable from HEAD — the CI path. */
function checkHistory() {
    const raw = git([
        'log',
        `--format=%H${FIELD}%an <%ae>${FIELD}%cn <%ce>${FIELD}%B${RECORD}`,
    ]);

    const commits = raw
        .split(RECORD)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [hash, author, committer, ...rest] = entry.split(FIELD);
            return {
                hash: hash ?? '',
                author: author ?? '',
                committer: committer ?? '',
                message: rest.join(FIELD),
            };
        });

    const problems = [];
    for (const { hash, author, committer, message } of commits) {
        const short = hash.slice(0, 8);

        for (const pattern of FORBIDDEN_IN_MESSAGE) {
            const match = pattern.exec(message);
            if (match) problems.push(`${short} message contains: ${match[0].trim()}`);
        }
        for (const pattern of FORBIDDEN_IN_IDENTITY) {
            if (pattern.test(author)) problems.push(`${short} author is: ${author}`);
            if (pattern.test(committer)) problems.push(`${short} committer is: ${committer}`);
        }
    }

    if (problems.length > 0) {
        fail([
            ...problems,
            '',
            'Rewrite the offending commits before pushing, for example:',
            '  git filter-branch -f --msg-filter "sed \'/^Co-Authored-By: Claude/d\'" -- main',
            '  git push --force-with-lease origin main',
        ]);
    }

    console.log(
        `✓ Authorship check passed — ${commits.length} commit(s), sole authorship verified`
    );
}

const messageFlagIndex = process.argv.indexOf('--message');
if (messageFlagIndex !== -1) {
    const messageFile = process.argv[messageFlagIndex + 1];
    if (!messageFile) fail(['--message requires a path to the commit message file']);
    checkPendingCommit(messageFile);
} else {
    checkHistory();
}
