import type { Page } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/**
 * Clears a field and types a value into it.
 *
 * @param page - Page holding the field.
 * @param selector - Selector for the field.
 * @param value - Value to enter.
 * @param timeout - How long to wait for the field to be editable, in milliseconds.
 *
 * @example
 * ```ts
 * await fill(page, locators.username, 'standard_user');
 * ```
 */
export async function fill(
    page: Page,
    selector: string,
    value: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`fill ${selector}`, async () => {
        await page.locator(selector).fill(value, { timeout });
    });
}

/**
 * Types a value one key at a time, firing a keystroke event per character.
 *
 * `fill` sets the value in a single operation, which some autocomplete and
 * search-as-you-type widgets never notice. Reach for this only when a field
 * genuinely needs per-key events — it is markedly slower.
 *
 * @param page - Page holding the field.
 * @param selector - Selector for the field.
 * @param value - Value to type.
 * @param delayMs - Pause between keystrokes, in milliseconds.
 */
export async function type(
    page: Page,
    selector: string,
    value: string,
    delayMs = 50
): Promise<void> {
    await action(`type into ${selector}`, async () => {
        await page.locator(selector).pressSequentially(value, { delay: delayMs });
    });
}

/**
 * Selects an option in a `<select>` element by its value attribute.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the `<select>`.
 * @param value - Value attribute of the option to select.
 * @param timeout - How long to wait for the element, in milliseconds.
 */
export async function selectOption(
    page: Page,
    selector: string,
    value: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`select "${value}" in ${selector}`, async () => {
        await page.locator(selector).selectOption(value, { timeout });
    });
}

/**
 * Attaches one or more files to a file input.
 *
 * @param page - Page holding the input.
 * @param selector - Selector for the `<input type="file">`.
 * @param filePaths - Absolute path, or paths, of the files to attach.
 * @param timeout - How long to wait for the input, in milliseconds.
 */
export async function uploadFiles(
    page: Page,
    selector: string,
    filePaths: string | string[],
    timeout: number = TIMEOUTS.action
): Promise<void> {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    await action(`upload ${paths.length} file(s) to ${selector}`, async () => {
        await page.locator(selector).setInputFiles(paths, { timeout });
    });
}

/**
 * Presses a key while an element holds focus.
 *
 * @param page - Page holding the element.
 * @param selector - Selector for the element.
 * @param key - Key to press, e.g. `'Enter'` or `'Escape'`.
 * @param timeout - How long to wait for the element, in milliseconds.
 */
export async function press(
    page: Page,
    selector: string,
    key: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`press ${key} on ${selector}`, async () => {
        await page.locator(selector).press(key, { timeout });
    });
}
