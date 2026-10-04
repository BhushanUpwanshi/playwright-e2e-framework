import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

/**
 * Serves a local copy of the the-internet pages the cross-tab journey uses.
 *
 * The journey is not testing the-internet — it demonstrates one continuous video
 * across two tabs. Depending on the public Heroku app for that made the check
 * fail whenever the site was slow, which it often is. These pages reproduce
 * just the markup the screens rely on, and nothing outside this process can
 * make them time out.
 */
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'the-internet');

const ROUTES: Readonly<Record<string, string>> = {
    '/windows': 'windows.html',
    '/windows/new': 'windows-new.html',
    '/dynamic_loading/2': 'dynamic-loading-2.html',
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/** A running fixture server. */
export interface FixtureServer {
    close(): Promise<void>;
}

/**
 * Starts the fixture server on the port in `baseUrl`, if `baseUrl` is local.
 *
 * Returns `null` for any other URL, so pointing `THE_INTERNET_URL` at the real
 * site runs the journey against it with no other change.
 *
 * @param baseUrl - The resolved `BASE_URLS.theInternet`.
 *
 * @returns The running server, or `null` when the target is remote.
 */
export async function serveTheInternet(baseUrl: string): Promise<FixtureServer | null> {
    const { hostname, port } = new URL(baseUrl);
    if (!LOCAL_HOSTS.has(hostname)) return null;

    const server = http.createServer((req, res) => {
        const file = ROUTES[new URL(req.url ?? '/', baseUrl).pathname];
        if (!file) {
            res.writeHead(404).end();
            return;
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        fs.createReadStream(path.join(FIXTURES_DIR, file)).pipe(res);
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(Number(port), hostname, resolve);
    });

    return {
        close: () => new Promise((resolve) => server.close(() => resolve())),
    };
}
