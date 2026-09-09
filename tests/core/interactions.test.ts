import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

import { navigateTo, reload } from '@core/interactions/navigation';
import { click, clickAndWaitForResponse, scrollIntoView } from '@core/interactions/click';
import { fill, type as typeText, selectOption, press } from '@core/interactions/input';
import { getText, getAllText, getAttribute, isVisible, count } from '@core/interactions/query';
import { waitForVisible, waitForHidden, waitForUrl, waitForStableText } from '@core/interactions/waits';
import { setToggle, isToggled, waitForEnabled, waitForDisabled } from '@core/interactions/toggles';
import { uploadFiles, downloadFile } from '@core/interactions/files';
import { FIXTURE_ORIGIN, serveFixture } from './fixture-page';

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

let browser: Browser;
let page: Page;

beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
    await browser?.close();
});

beforeEach(async () => {
    // Action logging is verbose by design; it would drown the test report.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    if (page) await page.close();
    page = await browser.newPage();
    await serveFixture(page, HTML);
});

describe('navigation', () => {
    it('navigates to a URL', async () => {
        expect(page.url()).toBe(`${FIXTURE_ORIGIN}/`);
    });

    it('reloads without losing the page', async () => {
        await reload(page);
        expect(await getText(page, '#title')).toBe('Fixture');
    });

    it('reports the URL it failed on', async () => {
        await expect(navigateTo(page, 'https://unreachable.invalid/', 2_000)).rejects.toThrowError(
            /navigate to https:\/\/unreachable\.invalid/
        );
    });
});

describe('query', () => {
    it('reads trimmed text', async () => {
        expect(await getText(page, '#title')).toBe('Fixture');
    });

    it('reads every matching element', async () => {
        expect(await getAllText(page, '.row')).toEqual(['one', 'two', 'three']);
    });

    it('reads an attribute', async () => {
        expect(await getAttribute(page, '#link', 'data-test')).toBe('the-link');
    });

    it('returns null for an absent attribute', async () => {
        expect(await getAttribute(page, '#link', 'data-missing')).toBeNull();
    });

    it('counts matches', async () => {
        expect(await count(page, '.row')).toBe(3);
    });

    it('returns zero when nothing matches', async () => {
        expect(await count(page, '.nothing')).toBe(0);
    });

    describe('isVisible', () => {
        it('is true for a visible element', async () => {
            expect(await isVisible(page, '#title')).toBe(true);
        });

        it('answers false rather than throwing when absent', async () => {
            expect(await isVisible(page, '#nope', 300)).toBe(false);
        });

        // The reason this wraps waitFor instead of page.isVisible(): an element
        // one tick from rendering must not be reported as absent.
        it('waits for an element that appears late', async () => {
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

describe('input', () => {
    it('fills a field', async () => {
        await fill(page, '#name', 'bhushan');
        expect(await page.inputValue('#name')).toBe('bhushan');
    });

    it('replaces an existing value', async () => {
        await fill(page, '#name', 'first');
        await fill(page, '#name', 'second');
        expect(await page.inputValue('#name')).toBe('second');
    });

    it('types with per-key events', async () => {
        await typeText(page, '#search', 'abc', 1);
        expect(await page.inputValue('#search')).toBe('abc');
        expect(await getText(page, '#result')).toBe('typed');
    });

    it('selects an option', async () => {
        await selectOption(page, '#pick', 'b');
        expect(await page.inputValue('#pick')).toBe('b');
    });

    it('presses a key', async () => {
        await press(page, '#search', 'Enter');
        expect(await getText(page, '#result')).toBe('typed');
    });
});

describe('click', () => {
    it('clicks an element', async () => {
        await click(page, '#go');
        expect(await getText(page, '#result')).toBe('clicked');
    });

    it('names the element in the failure', async () => {
        await expect(click(page, '#missing', { timeout: 400 })).rejects.toThrowError(
            /click #missing/
        );
    });

    it('keeps the Playwright error as cause', async () => {
        await expect(click(page, '#missing', { timeout: 400 })).rejects.toSatisfy(
            (error: Error) => error.cause instanceof Error
        );
    });

    it('scrolls an off-screen element into view', async () => {
        await scrollIntoView(page, '#far');
        const inViewport = await page.locator('#far').evaluate((el) => {
            const { top, bottom } = el.getBoundingClientRect();
            return top >= 0 && bottom <= window.innerHeight;
        });
        expect(inViewport).toBe(true);
    });

    // Registering the listener before the click is what stops a fast response
    // landing in the gap between the two.
    it('clicks and captures the response it triggers', async () => {
        await page.route(`${FIXTURE_ORIGIN}/api/thing`, (route) =>
            route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' })
        );

        const response = await clickAndWaitForResponse(page, '#fetcher', '**/api/thing');
        expect(response.status()).toBe(201);
    });
});

describe('waits', () => {
    it('waits for an element to be visible', async () => {
        await expect(waitForVisible(page, '#title')).resolves.toBeUndefined();
    });

    it('waits for an element to disappear', async () => {
        await waitForHidden(page, '#spinner', 5_000);
        expect(await page.locator('#spinner').isVisible()).toBe(false);
    });

    it('reports which element never appeared', async () => {
        await expect(waitForVisible(page, '#nope', 400)).rejects.toThrowError(
            /wait for #nope to be visible/
        );
    });

    it('waits for a URL', async () => {
        await page.evaluate(() => history.pushState({}, '', '/arrived'));
        await expect(waitForUrl(page, '**/arrived', 5_000)).resolves.toBeUndefined();
    });

    describe('waitForStableText', () => {
        it('returns the value only once it stops changing', async () => {
            expect(await waitForStableText(page, '#counter', 300, 10_000)).toBe('3');
        });

        it('gives up on text that never settles', async () => {
            await page.evaluate(() => {
                let n = 0;
                setInterval(() => {
                    document.getElementById('counter')!.textContent = String(n++);
                }, 50);
            });

            await expect(waitForStableText(page, '#counter', 500, 1_500)).rejects.toThrowError(
                /did not settle/
            );
        });
    });
});

describe('toggles', () => {
    it('reports the current state', async () => {
        expect(await isToggled(page, '#flag')).toBe(false);
        expect(await isToggled(page, '#prechecked')).toBe(true);
    });

    it('turns a toggle on', async () => {
        expect(await setToggle(page, '#flag', true)).toBe(true);
        expect(await isToggled(page, '#flag')).toBe(true);
    });

    // A bare click flips; asking for a state does not. This is the bug the
    // helper exists to prevent: "enable it" silently disabling an already-on
    // control, which only fails depending on what ran before.
    it('is a no-op when the toggle is already in the wanted state', async () => {
        expect(await setToggle(page, '#prechecked', true)).toBe(false);
        expect(await isToggled(page, '#prechecked')).toBe(true);
    });

    it('is idempotent across repeated calls', async () => {
        await setToggle(page, '#flag', true);
        await setToggle(page, '#flag', true);
        await setToggle(page, '#flag', true);
        expect(await isToggled(page, '#flag')).toBe(true);
    });

    it('turns a toggle off', async () => {
        expect(await setToggle(page, '#prechecked', false)).toBe(true);
        expect(await isToggled(page, '#prechecked')).toBe(false);
    });

    it('waits for a control the toggle enables', async () => {
        expect(await page.locator('#guarded').isDisabled()).toBe(true);
        await setToggle(page, '#flag', true);
        await expect(waitForEnabled(page, '#guarded', 5_000)).resolves.toBeUndefined();
    });

    it('waits for a control to become disabled', async () => {
        await setToggle(page, '#flag', true);
        await waitForEnabled(page, '#guarded', 5_000);

        await setToggle(page, '#flag', false);
        await expect(waitForDisabled(page, '#guarded', 5_000)).resolves.toBeUndefined();
    });

    it('reports which control stayed disabled', async () => {
        await expect(waitForEnabled(page, '#guarded', 600)).rejects.toThrowError(
            /wait for #guarded to be enabled/
        );
    });
});

describe('files', () => {
    let uploadPath: string;

    beforeAll(() => {
        uploadPath = path.join(os.tmpdir(), `pw-e2e-upload-${Date.now()}.txt`);
        fs.writeFileSync(uploadPath, 'fixture content');
    });

    afterAll(() => {
        fs.rmSync(uploadPath, { force: true });
    });

    it('uploads a file to a file input', async () => {
        await uploadFiles(page, '#file', uploadPath);
        expect(await getText(page, '#file-name')).toBe(path.basename(uploadPath));
    });

    it('accepts an array of paths', async () => {
        await uploadFiles(page, '#file', [uploadPath]);
        expect(await getText(page, '#file-name')).toBe(path.basename(uploadPath));
    });

    it('names the input in the failure', async () => {
        await expect(uploadFiles(page, '#no-such-input', uploadPath, 400)).rejects.toThrowError(
            /upload 1 file\(s\) to #no-such-input/
        );
    });

    describe('downloadFile', () => {
        it('saves the file and reports the suggested name', async () => {
            const file = await downloadFile(page, () => click(page, '#dl'));

            expect(file.suggestedFilename).toBe('report.csv');
            expect(fs.existsSync(file.savedAs)).toBe(true);
            // Saved somewhere durable — Playwright discards downloads with the context.
            expect(fs.readFileSync(file.savedAs, 'utf-8')).toBe('name,total\nwidget,42\n');

            fs.rmSync(file.savedAs, { force: true });
        });

        it('saves into a given directory', async () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-e2e-dl-'));

            const file = await downloadFile(page, () => click(page, '#dl'), dir);

            expect(path.dirname(file.savedAs)).toBe(dir);
            fs.rmSync(dir, { recursive: true, force: true });
        });

        it('fails when the trigger starts no download', async () => {
            await expect(downloadFile(page, () => click(page, '#go'), undefined, 800)).rejects.toThrowError(
                /download a file/
            );
        });
    });
});
