import type { Page } from 'playwright';

/**
 * Serves fixture HTML from a fake origin, intercepted in the browser.
 *
 * Tests for `core/` need a page to act on, but must not depend on a live site —
 * a network blip should not turn the framework's own suite red. Routing a fake
 * origin gives real URLs, working relative links and real response headers,
 * with no server to start and nothing to reach over the network.
 *
 * The `/download-me` route answers with `Content-Disposition: attachment`, which
 * is what actually makes Chromium raise a download event.
 */

export const FIXTURE_ORIGIN = 'https://fixture.test';

/**
 * Serves `html` at the fixture origin and navigates to it.
 *
 * @param page - Page to route and navigate.
 * @param html - Document body to serve.
 */
export async function serveFixture(page: Page, html: string): Promise<void> {
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
        const url = route.request().url();

        if (url.endsWith('/download-me')) {
            return route.fulfill({
                status: 200,
                headers: {
                    'content-type': 'text/csv',
                    'content-disposition': 'attachment; filename="report.csv"',
                },
                body: 'name,total\nwidget,42\n',
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: `<!doctype html><html><body>${html}</body></html>`,
        });
    });

    await page.goto(`${FIXTURE_ORIGIN}/`);
}
