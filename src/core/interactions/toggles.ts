import type { Page } from 'playwright';
import { action } from '@core/logging/action';
import { TIMEOUTS } from '@core/config/env';

/**
 * Reports whether a checkbox, radio or switch is currently on.
 *
 * @param page - Page holding the control.
 * @param selector - Selector for the control.
 * @param timeout - How long to wait for the control, in milliseconds.
 *
 * @returns `true` when the control is checked.
 */
export async function isToggled(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<boolean> {
    const locator = page.locator(selector);
    await locator.waitFor({ state: 'attached', timeout });
    return locator.isChecked();
}

/**
 * Drives a toggle to a required state, doing nothing if it is already there.
 *
 * The reason this exists rather than a bare `click`: a click *flips* a toggle,
 * so a test that clicks to "enable" something silently disables it whenever the
 * control starts on. That failure is state-dependent — it passes in isolation
 * and fails when a test runs after one that left the toggle set, which is the
 * hardest kind of flake to trace back. Asking for a state instead of an action
 * removes the class of bug entirely.
 *
 * @param page - Page holding the control.
 * @param selector - Selector for the control.
 * @param desired - The state to end in.
 * @param timeout - How long to wait for the control, in milliseconds.
 *
 * @returns `true` if the control was changed, `false` if it was already correct.
 *
 * @example
 * ```ts
 * await setToggle(page, '#remember-me', true);  // on, however it started
 * await setToggle(page, '#remember-me', true);  // no-op
 * ```
 */
export async function setToggle(
    page: Page,
    selector: string,
    desired: boolean,
    timeout: number = TIMEOUTS.action
): Promise<boolean> {
    return action(`set ${selector} to ${desired ? 'on' : 'off'}`, async () => {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout });

        if ((await locator.isChecked()) === desired) return false;

        // setChecked is used over click(): it asserts the resulting state rather
        // than assuming the click landed on something that toggles.
        await locator.setChecked(desired, { timeout });
        return true;
    });
}

/**
 * Waits for a control to become enabled.
 *
 * The usual case is a form control a toggle elsewhere on the page controls,
 * where the enabling is asynchronous and interacting too early is silently
 * ignored by the browser.
 *
 * @param page - Page holding the control.
 * @param selector - Selector for the control.
 * @param timeout - How long to wait, in milliseconds.
 *
 * @throws {Error} When the control is still disabled at the timeout.
 */
export async function waitForEnabled(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`wait for ${selector} to be enabled`, async () => {
        const locator = page.locator(selector);
        const deadline = Date.now() + timeout;

        await locator.waitFor({ state: 'visible', timeout });
        while (Date.now() < deadline) {
            if (await locator.isEnabled()) return;
            await page.waitForTimeout(100);
        }
        throw new Error(`still disabled after ${timeout}ms`);
    });
}

/**
 * Waits for a control to become disabled.
 *
 * @param page - Page holding the control.
 * @param selector - Selector for the control.
 * @param timeout - How long to wait, in milliseconds.
 *
 * @throws {Error} When the control is still enabled at the timeout.
 */
export async function waitForDisabled(
    page: Page,
    selector: string,
    timeout: number = TIMEOUTS.action
): Promise<void> {
    await action(`wait for ${selector} to be disabled`, async () => {
        const locator = page.locator(selector);
        const deadline = Date.now() + timeout;

        await locator.waitFor({ state: 'attached', timeout });
        while (Date.now() < deadline) {
            if (await locator.isDisabled()) return;
            await page.waitForTimeout(100);
        }
        throw new Error(`still enabled after ${timeout}ms`);
    });
}
