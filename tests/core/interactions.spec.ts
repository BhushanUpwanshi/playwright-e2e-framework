import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import { navigateTo, reload } from '@core/interactions/navigation';
import { click, clickAndWaitForResponse, scrollIntoView } from '@core/interactions/click';
import { fill, type as typeText, selectOption, press } from '@core/interactions/input';
import { getText, getAllText, getAttribute, isVisible, count } from '@core/interactions/query';
import { waitForVisible, waitForHidden, waitForUrl, waitForStableText } from '@core/interactions/waits';
import { setToggle, isToggled, waitForEnabled, waitForDisabled } from '@core/interactions/toggles';
import { uploadFiles, downloadFile } from '@core/interactions/files';
import { FIXTURE_ORIGIN, serveFixture } from './fixture-page';
import { silenceLog, restoreLog } from './capture-log';

const HTML = `
  <h1 id="title">Fixture</h1>

  <input id="name" />
  <input id="search" />
  <select id="pick"><option value="a">A</option><option value="b">B</option></select>

  <ul><li class="row">one</li><li class="row">two</li><li class="row">three</li></ul>
  <a id="link" href="/next" data-test="the-link">next</a>

  <div id="spinner">loading…</div>
  <div id="counter">0</div>

  <button id="go">Go</button>
  <div id="result"></div>

  <input type="checkbox" id="flag" />
  <input type="checkbox" id="prechecked" checked />
  <input id="guarded" disabled />

  <input type="file" id="file" />
  <div id="file-name"></div>

  <a id="dl" href="/download-me">download</a>

  <div style="height: 1500px"></div>
  <button id="far">Far away</button>

  <button id="fetcher">Fetch</button>

  <script>
    setTimeout(function () { document.getElementById('spinner').style.display = 'none'; }, 250);

    var n = 0;
    var tick = setInterval(function () {
      n++; document.getElementById('counter').textContent = String(n);
      if (n >= 3) clearInterval(tick);
    }, 100);

    document.getElementById('go').addEventListener('click', function () {
      document.getElementById('result').textContent = 'clicked';
    });

    document.getElementById('search').addEventListener('keydown', function () {
      document.getElementById('result').textContent = 'typed';
    });

    document.getElementById('flag').addEventListener('change', function () {
      document.getElementById('guarded').disabled = !this.checked;
    });

    document.getElementById('file').addEventListener('change', function () {
      document.getElementById('file-name').textContent = this.files[0] ? this.files[0].name : '';
    });

    document.getElementById('fetcher').addEventListener('click', function () {
      fetch('/api/thing');
    });
  </script>
`;

/**
 * Captures the error a call rejects with.
 *
 * Written out rather than reaching for `expect(...).rejects`, because the
 * assertions here are about the error *object* — its message shape and its
 * `cause` — and reading them off a returned value is plainer than chaining
 * matchers onto a promise.
 *
 * @throws {Error} When the call unexpectedly succeeds.
 */
async function rejection(fn: () => Promise<unknown>): Promise<Error> {
    try {
        await fn();
    } catch (error) {
        return error as Error;
    }
    throw new Error('expected the call to reject, but it resolved');
}

test.beforeEach(async ({ page }) => {
    // The interaction layer logs every action by design. Useful in a real run,
    // noise in a test report.
    silenceLog();
    await serveFixture(page, HTML);
});

test.afterEach(() => {
    restoreLog();
});

test.describe('navigation', () => {
    test('navigates to a URL', async ({ page }) => {
        expect(page.url()).toBe(`${FIXTURE_ORIGIN}/`);
    });

    test('reloads without losing the page', async ({ page }) => {
        await reload(page);
        expect(await getText(page, '#title')).toBe('Fixture');
    });

    test('reports the URL it failed on', async ({ page }) => {
        const error = await rejection(() => navigateTo(page, 'https://unreachable.invalid/', 2_000));
        expect(error.message).toContain('navigate to https://unreachable.invalid/');
    });
});

test.describe('query', () => {
    test('reads trimmed text', async ({ page }) => {
        expect(await getText(page, '#title')).toBe('Fixture');
    });

    test('reads every matching element', async ({ page }) => {
        expect(await getAllText(page, '.row')).toEqual(['one', 'two', 'three']);
    });

    test('reads an attribute', async ({ page }) => {
        expect(await getAttribute(page, '#link', 'data-test')).toBe('the-link');
    });

    test('returns null for an absent attribute', async ({ page }) => {
        expect(await getAttribute(page, '#link', 'data-missing')).toBeNull();
    });

    test('counts matches', async ({ page }) => {
        expect(await count(page, '.row')).toBe(3);
    });

    test('returns zero when nothing matches', async ({ page }) => {
        expect(await count(page, '.nothing')).toBe(0);
    });

    test.describe('isVisible', () => {
        test('is true for a visible element', async ({ page }) => {
            expect(await isVisible(page, '#title')).toBe(true);
        });

        test('answers false rather than throwing when absent', async ({ page }) => {
            expect(await isVisible(page, '#nope', 300)).toBe(false);
        });

        // The reason this wraps waitFor instead of page.isVisible(): an element
        // one tick from rendering must not be reported as absent.
        test('waits for an element that appears late', async ({ page }) => {
            await page.evaluate(() => {
                setTimeout(() => {
                    const el = document.createElement('div');
                    el.id = 'late';
                    el.textContent = 'here';
                    document.body.appendChild(el);
                }, 400);
            });

            expect(await isVisible(page, '#late', 5_000)).toBe(true);
        });
    });
});

test.describe('input', () => {
    test('fills a field', async ({ page }) => {
        await fill(page, '#name', 'bhushan');
        expect(await page.inputValue('#name')).toBe('bhushan');
    });

    test('replaces an existing value', async ({ page }) => {
        await fill(page, '#name', 'first');
        await fill(page, '#name', 'second');
        expect(await page.inputValue('#name')).toBe('second');
    });

    test('types with per-key events', async ({ page }) => {
        await typeText(page, '#search', 'abc', 1);
        expect(await page.inputValue('#search')).toBe('abc');
        expect(await getText(page, '#result')).toBe('typed');
    });

    test('selects an option', async ({ page }) => {
        await selectOption(page, '#pick', 'b');
        expect(await page.inputValue('#pick')).toBe('b');
    });

    test('presses a key', async ({ page }) => {
        await press(page, '#search', 'Enter');
        expect(await getText(page, '#result')).toBe('typed');
    });
});

test.describe('click', () => {
    test('clicks an element', async ({ page }) => {
        await click(page, '#go');
        expect(await getText(page, '#result')).toBe('clicked');
    });

    test('names the element in the failure', async ({ page }) => {
        const error = await rejection(() => click(page, '#missing', { timeout: 400 }));
        expect(error.message).toContain('click #missing');
    });

    test('keeps the Playwright error as cause', async ({ page }) => {
        const error = await rejection(() => click(page, '#missing', { timeout: 400 }));
        expect(error.cause).toBeInstanceOf(Error);
    });

    test('scrolls an off-screen element into view', async ({ page }) => {
        await scrollIntoView(page, '#far');

        const inViewport = await page.locator('#far').evaluate((el) => {
            const { top, bottom } = el.getBoundingClientRect();
            return top >= 0 && bottom <= window.innerHeight;
        });
        expect(inViewport).toBe(true);
    });

    // Registering the listener before the click is what stops a fast response
    // landing in the gap between the two.
    test('clicks and captures the response it triggers', async ({ page }) => {
        await page.route(`${FIXTURE_ORIGIN}/api/thing`, (route) =>
            route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' })
        );

        const response = await clickAndWaitForResponse(page, '#fetcher', '**/api/thing');
        expect(response.status()).toBe(201);
    });
});

test.describe('waits', () => {
    test('waits for an element to be visible', async ({ page }) => {
        await waitForVisible(page, '#title');
    });

    test('waits for an element to disappear', async ({ page }) => {
        await waitForHidden(page, '#spinner', 5_000);
        expect(await page.locator('#spinner').isVisible()).toBe(false);
    });

    test('reports which element never appeared', async ({ page }) => {
        const error = await rejection(() => waitForVisible(page, '#nope', 400));
        expect(error.message).toContain('wait for #nope to be visible');
    });

    test('waits for a URL', async ({ page }) => {
        await page.evaluate(() => history.pushState({}, '', '/arrived'));
        await waitForUrl(page, '**/arrived', 5_000);
    });

    test.describe('waitForStableText', () => {
        test('returns the value only once it stops changing', async ({ page }) => {
            expect(await waitForStableText(page, '#counter', 300, 10_000)).toBe('3');
        });

        test('gives up on text that never settles', async ({ page }) => {
            await page.evaluate(() => {
                let n = 0;
                setInterval(() => {
                    document.getElementById('counter')!.textContent = String(n++);
                }, 50);
            });

            const error = await rejection(() => waitForStableText(page, '#counter', 500, 1_500));
            expect(error.message).toContain('did not settle');
        });
    });
});

test.describe('toggles', () => {
    test('reports the current state', async ({ page }) => {
        expect(await isToggled(page, '#flag')).toBe(false);
        expect(await isToggled(page, '#prechecked')).toBe(true);
    });

    test('turns a toggle on', async ({ page }) => {
        expect(await setToggle(page, '#flag', true)).toBe(true);
        expect(await isToggled(page, '#flag')).toBe(true);
    });

    // A bare click flips; asking for a state does not. This is the bug the
    // helper exists to prevent: "enable it" silently disabling an already-on
    // control, which only fails depending on what ran before.
    test('is a no-op when the toggle is already in the wanted state', async ({ page }) => {
        expect(await setToggle(page, '#prechecked', true)).toBe(false);
        expect(await isToggled(page, '#prechecked')).toBe(true);
    });

    test('is idempotent across repeated calls', async ({ page }) => {
        await setToggle(page, '#flag', true);
        await setToggle(page, '#flag', true);
        await setToggle(page, '#flag', true);
        expect(await isToggled(page, '#flag')).toBe(true);
    });

    test('turns a toggle off', async ({ page }) => {
        expect(await setToggle(page, '#prechecked', false)).toBe(true);
        expect(await isToggled(page, '#prechecked')).toBe(false);
    });

    test('waits for a control the toggle enables', async ({ page }) => {
        expect(await page.locator('#guarded').isDisabled()).toBe(true);
        await setToggle(page, '#flag', true);
        await waitForEnabled(page, '#guarded', 5_000);
    });

    test('waits for a control to become disabled', async ({ page }) => {
        await setToggle(page, '#flag', true);
        await waitForEnabled(page, '#guarded', 5_000);

        await setToggle(page, '#flag', false);
        await waitForDisabled(page, '#guarded', 5_000);
    });

    test('reports which control stayed disabled', async ({ page }) => {
        const error = await rejection(() => waitForEnabled(page, '#guarded', 600));
        expect(error.message).toContain('wait for #guarded to be enabled');
    });
});

test.describe('files', () => {
    const uploadPath = path.join(os.tmpdir(), 'pw-e2e-upload-fixture.txt');

    test.beforeAll(() => {
        fs.writeFileSync(uploadPath, 'fixture content');
    });

    test.afterAll(() => {
        fs.rmSync(uploadPath, { force: true });
    });

    test('uploads a file to a file input', async ({ page }) => {
        await uploadFiles(page, '#file', uploadPath);
        expect(await getText(page, '#file-name')).toBe(path.basename(uploadPath));
    });

    test('accepts an array of paths', async ({ page }) => {
        await uploadFiles(page, '#file', [uploadPath]);
        expect(await getText(page, '#file-name')).toBe(path.basename(uploadPath));
    });

    test('names the input in the failure', async ({ page }) => {
        const error = await rejection(() => uploadFiles(page, '#no-such-input', uploadPath, 400));
        expect(error.message).toContain('upload 1 file(s) to #no-such-input');
    });

    test.describe('downloadFile', () => {
        test('saves the file and reports the suggested name', async ({ page }) => {
            const file = await downloadFile(page, () => click(page, '#dl'));

            expect(file.suggestedFilename).toBe('report.csv');
            expect(fs.existsSync(file.savedAs)).toBe(true);
            // Saved somewhere durable — Playwright discards downloads with the context.
            expect(fs.readFileSync(file.savedAs, 'utf-8')).toBe('name,total\nwidget,42\n');

            fs.rmSync(file.savedAs, { force: true });
        });

        test('saves into a given directory', async ({ page }) => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-e2e-dl-'));

            const file = await downloadFile(page, () => click(page, '#dl'), dir);

            expect(path.dirname(file.savedAs)).toBe(dir);
            fs.rmSync(dir, { recursive: true, force: true });
        });

        test('fails when the trigger starts no download', async ({ page }) => {
            const error = await rejection(() =>
                downloadFile(page, () => click(page, '#go'), undefined, 800)
            );
            expect(error.message).toContain('download a file');
        });
    });
});
