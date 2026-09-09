import path from 'node:path';
import os from 'node:os';
import type { Download, Page } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/**
 * Attaches one or more files to a file input.
 *
 * @param page - Page holding the input.
 * @param selector - Selector for the `<input type="file">`.
 * @param filePaths - Absolute path, or paths, of the files to attach.
 * @param timeout - How long to wait for the input, in milliseconds.
 *
 * @example
 * ```ts
 * await uploadFiles(page, '#file-upload', path.resolve('fixtures/invoice.pdf'));
 * ```
 */
export async function uploadFiles(
    page: Page,
    selector: string,
    filePaths: string | string[],
    timeout: number = TIMEOUTS.action
): Promise<void> {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    await action(`upload ${paths.length} file(s) to ${selector}`, async () => {
        // setInputFiles works on a hidden input, so there is no need to make the
        // control visible first — a common and unnecessary workaround.
        await page.locator(selector).setInputFiles(paths, { timeout });
    });
}

/** A file the browser downloaded. */
export interface DownloadedFile {
    /** Name the server suggested, e.g. `report.csv`. */
    suggestedFilename: string;
    /** Absolute path the file was saved to. */
    savedAs: string;
}

/**
 * Runs an action that starts a download and saves the resulting file.
 *
 * The download listener is registered **before** the trigger runs. Clicking
 * first and then waiting loses any download that completes in the gap — small
 * files over a fast connection lose that race regularly, which reads as an
 * intermittent failure rather than the ordering bug it is.
 *
 * Playwright deletes downloads when the browser context closes, so the file is
 * copied somewhere durable before this returns.
 *
 * @param page - Page that will start the download.
 * @param trigger - Action that starts it, typically a click.
 * @param saveDir - Directory to save into. Defaults to a temp directory.
 * @param timeout - How long to wait for the download to begin, in milliseconds.
 *
 * @returns The suggested filename and the absolute path it was saved to.
 *
 * @example
 * ```ts
 * const file = await downloadFile(page, () => click(page, 'a[href$=".csv"]'));
 * soft.assertContains(file.suggestedFilename, '.csv', 'downloaded file type');
 * ```
 */
export async function downloadFile(
    page: Page,
    trigger: () => Promise<void>,
    saveDir: string = os.tmpdir(),
    timeout: number = TIMEOUTS.navigation
): Promise<DownloadedFile> {
    return action('download a file', async () => {
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout }),
            trigger(),
        ]);

        const suggestedFilename = (download as Download).suggestedFilename();
        const savedAs = path.join(saveDir, suggestedFilename);
        await download.saveAs(savedAs);

        return { suggestedFilename, savedAs };
    });
}
