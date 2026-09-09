/**
 * Environment resolution and base URLs.
 *
 * Deliberately the only place in the framework that reads `process.env`. Screens
 * and interactions receive values; they never look them up, which is what keeps
 * them usable from both the `@playwright/test` runner and a plain Node journey.
 */

export type Env = 'dev' | 'qa' | 'prod';

const VALID_ENVS: readonly Env[] = ['dev', 'qa', 'prod'];

/** Applications under test. Public demo targets — no credentials worth protecting. */
export interface BaseUrls {
    /** Sauce Demo — stable e-commerce flow, used by the runner suite. */
    sauceDemo: string;
    /** the-internet — dynamic and multi-window pages, used by the standalone suite. */
    theInternet: string;
}

const URLS_BY_ENV: Readonly<Record<Env, BaseUrls>> = {
    // All three point at the same public sites; the split exists so the shape
    // matches a real project, where these would differ per environment.
    dev: {
        sauceDemo: 'https://www.saucedemo.com',
        theInternet: 'https://the-internet.herokuapp.com',
    },
    qa: {
        sauceDemo: 'https://www.saucedemo.com',
        theInternet: 'https://the-internet.herokuapp.com',
    },
    prod: {
        sauceDemo: 'https://www.saucedemo.com',
        theInternet: 'https://the-internet.herokuapp.com',
    },
};

/**
 * Resolves the target environment from `process.env.ENV`, defaulting to `prod`.
 *
 * @throws {Error} When `ENV` is set to something that is not a known environment.
 *   Failing loudly beats silently testing the wrong environment.
 */
export function resolveEnv(raw: string | undefined = process.env.ENV): Env {
    if (raw === undefined || raw === '') return 'prod';

    const candidate = raw.toLowerCase() as Env;
    if (!VALID_ENVS.includes(candidate)) {
        throw new Error(
            `Unknown ENV "${raw}". Expected one of: ${VALID_ENVS.join(', ')}.`
        );
    }
    return candidate;
}

/** The environment this process is targeting. */
export const ENV: Env = resolveEnv();

/** Base URLs for the resolved environment. */
export const BASE_URLS: BaseUrls = URLS_BY_ENV[ENV];

/** Default timeouts, in milliseconds. Shared by both execution engines. */
export const TIMEOUTS = {
    action: 15_000,
    navigation: 30_000,
    expect: 10_000,
} as const;
